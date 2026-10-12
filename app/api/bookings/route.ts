import { and, count, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { bookingApplications, hostelRooms, hostels, roomAssignments, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/server-auth";

export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    if (user.role === "admin") {
      const rows = await db.select({
        application: bookingApplications,
        studentName: users.name,
        regNo: users.regNo,
        hostelName: hostels.name,
        roomNo: hostelRooms.roomNo,
      }).from(bookingApplications)
        .innerJoin(users, eq(users.id, bookingApplications.studentId))
        .leftJoin(hostels, eq(hostels.id, bookingApplications.hostelId))
        .leftJoin(hostelRooms, eq(hostelRooms.id, bookingApplications.roomId))
        .orderBy(desc(bookingApplications.submittedAt));
      return Response.json(rows);
    }
    const rows = await db.select({
      application: bookingApplications,
      hostelName: hostels.name,
      roomNo: hostelRooms.roomNo,
      qrToken: roomAssignments.qrToken,
    }).from(bookingApplications)
      .leftJoin(hostels, eq(hostels.id, bookingApplications.hostelId))
      .leftJoin(hostelRooms, eq(hostelRooms.id, bookingApplications.roomId))
      .leftJoin(roomAssignments, eq(roomAssignments.applicationId, bookingApplications.id))
      .where(eq(bookingApplications.studentId, user.id))
      .orderBy(desc(bookingApplications.submittedAt));
    return Response.json(rows);
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to load booking applications." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("student");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.semester !== "string" || body.semester.trim().length < 3 || body.semester.trim().length > 80) {
      return Response.json({ error: "Enter a valid semester for this application." }, { status: 400 });
    }
    if (!user.regNo) return Response.json({ error: "Your student registration number is missing. Contact the hostel office before applying." }, { status: 409 });
    if (user.gender !== "male" && user.gender !== "female") return Response.json({ error: "Your verified hostel eligibility is missing. Contact the hostel office before applying." }, { status: 409 });

    const db = getDb();
    const [application] = await db.insert(bookingApplications).values({
      studentId: user.id,
      semester: body.semester.trim(),
      gender: user.gender,
    }).returning();
    return Response.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return Response.json({ error: await error.text() }, { status: error.status });
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return Response.json({ error: "An application already exists for that semester." }, { status: 409 });
    }
    console.error("Booking application failed:", error);
    return Response.json({ error: "Unable to submit this booking application." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== "string" || !["approved", "rejected", "waitlisted"].includes(String(body.status))) {
      return Response.json({ error: "Choose an application and a valid decision." }, { status: 400 });
    }
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      const [application] = await tx.select().from(bookingApplications)
        .where(eq(bookingApplications.id, body.id as string)).limit(1);
      if (!application) throw new Response("Booking application not found.", { status: 404 });
      if (!["pending", "waitlisted"].includes(application.status)) {
        throw new Response("This application has already been reviewed.", { status: 409 });
      }
      if (body.status !== "approved") {
        const [updated] = await tx.update(bookingApplications).set({
          status: body.status as string, reviewedAt: new Date(),
        }).where(and(eq(bookingApplications.id, application.id), eq(bookingApplications.status, application.status))).returning();
        if (!updated) throw new Response("This application has already been reviewed.", { status: 409 });
        return updated;
      }

      const [student] = await tx.select().from(users).where(eq(users.id, application.studentId)).limit(1);
      if (!student?.regNo) throw new Response("This student has no registration number and is not eligible for allocation.", { status: 409 });
      const candidates = await tx.select({
        hostelId: hostels.id, hostelName: hostels.name,
        roomId: hostelRooms.id, roomNo: hostelRooms.roomNo, capacity: hostelRooms.capacity,
      }).from(hostels).innerJoin(hostelRooms, eq(hostelRooms.hostelId, hostels.id))
        .where(and(eq(hostels.gender, application.gender), eq(hostels.active, true), eq(hostelRooms.active, true)))
        .orderBy(hostels.name, hostelRooms.roomNo);

      const lockedHostels = new Set<string>();
      for (const candidate of candidates) {
        if (!lockedHostels.has(candidate.hostelId)) {
          await tx.execute(sql`SELECT id FROM hostel_rooms WHERE hostel_id = ${candidate.hostelId} AND active = true ORDER BY room_no FOR UPDATE`);
          lockedHostels.add(candidate.hostelId);
        }
        const [occupied] = await tx.select({ value: count() }).from(roomAssignments)
          .where(and(
            eq(roomAssignments.active, true), ne(roomAssignments.studentId, application.studentId),
            or(
              eq(roomAssignments.roomId, candidate.roomId),
              and(isNull(roomAssignments.roomId), eq(roomAssignments.hostel, candidate.hostelName), eq(roomAssignments.room, candidate.roomNo)),
            ),
          ));
        if (occupied.value >= candidate.capacity) continue;

        const confirmationNo = `MUB-HT-${randomBytes(5).toString("hex").toUpperCase()}`;
        const [allocated] = await tx.update(bookingApplications).set({
          status: "approved", hostelId: candidate.hostelId, roomId: candidate.roomId,
          confirmationNo, reviewedAt: new Date(),
        }).where(and(eq(bookingApplications.id, application.id), eq(bookingApplications.status, application.status))).returning();
        if (!allocated) throw new Response("This application has already been reviewed.", { status: 409 });
        await tx.update(roomAssignments).set({ active: false }).where(and(
          eq(roomAssignments.studentId, application.studentId), eq(roomAssignments.active, true),
        ));
        await tx.insert(roomAssignments).values({
          studentId: application.studentId, applicationId: application.id, roomId: candidate.roomId,
          hostel: candidate.hostelName, room: candidate.roomNo,
        });
        return allocated;
      }

      const [waitlisted] = await tx.update(bookingApplications).set({
        status: "waitlisted", reviewedAt: new Date(),
      }).where(and(eq(bookingApplications.id, application.id), eq(bookingApplications.status, application.status))).returning();
      return waitlisted;
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof Response) return Response.json({ error: await error.text() }, { status: error.status });
    console.error("Booking review failed:", error);
    return Response.json({ error: "Unable to review this booking application." }, { status: 500 });
  }
}