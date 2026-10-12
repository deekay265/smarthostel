import { and, count, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { hostels, hostelRooms, roomAssignments } from "@/lib/db/schema";
import { requireUser } from "@/lib/server-auth";

const knownHostels: Record<string, "male" | "female"> = {
  Nyika: "male",
  Mpingwe: "male",
  "Ndirande A": "male",
  Hyrid: "female",
  Kapeni: "female",
  "Ndirande B": "female",
};

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "student" && user.gender !== "male" && user.gender !== "female") {
      return Response.json({ error: "Your verified hostel eligibility is missing. Contact the hostel office." }, { status: 409 });
    }
    const rows = await getDb().select({
      hostelId: hostels.id,
      name: hostels.name,
      gender: hostels.gender,
      active: hostels.active,
      roomId: hostelRooms.id,
      roomNo: hostelRooms.roomNo,
      capacity: hostelRooms.capacity,
      roomActive: hostelRooms.active,
      occupied: count(roomAssignments.id),
    }).from(hostels)
      .leftJoin(hostelRooms, eq(hostelRooms.hostelId, hostels.id))
      .leftJoin(roomAssignments, and(
        eq(roomAssignments.active, true), or(
          eq(roomAssignments.roomId, hostelRooms.id),
          and(isNull(roomAssignments.roomId), eq(roomAssignments.hostel, hostels.name), eq(roomAssignments.room, hostelRooms.roomNo)),
        ),
      ))
      .groupBy(hostels.id, hostelRooms.id)
      .orderBy(hostels.name, hostelRooms.roomNo);

    const grouped = new Map<string, {
      id: string; name: string; gender: string; active: boolean;
      rooms: { id: string; roomNo: string; capacity: number; occupied: number; active: boolean }[];
    }>();
    for (const row of rows) {
      const hostel = grouped.get(row.hostelId) ?? {
        id: row.hostelId, name: row.name, gender: row.gender, active: row.active, rooms: [],
      };
      if (row.roomId && row.roomNo && row.capacity !== null) {
        hostel.rooms.push({
          id: row.roomId, roomNo: row.roomNo, capacity: row.capacity,
          occupied: Number(row.occupied), active: row.roomActive ?? false,
        });
      }
      grouped.set(row.hostelId, hostel);
    }
    const inventory = [...grouped.values()];
    if (user.role === "admin") return Response.json(inventory);
    return Response.json(inventory.filter((hostel) => hostel.active && hostel.gender === user.gender)
      .map((hostel) => ({
        ...hostel,
        rooms: hostel.rooms.filter((room) => room.active && room.occupied < room.capacity),
      })).filter((hostel) => hostel.rooms.length > 0));
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to load hostels." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json() as Record<string, unknown>;
    const db = getDb();
    if (body.action === "create-room") {
      if (typeof body.hostelId !== "string" || typeof body.roomNo !== "string"
        || !body.roomNo.trim() || !Number.isInteger(body.capacity) || Number(body.capacity) < 1 || Number(body.capacity) > 20) {
        return Response.json({ error: "Select a hostel, enter a room number, and provide a capacity from 1 to 20." }, { status: 400 });
      }
      const [hostel] = await db.select({ id: hostels.id }).from(hostels)
        .where(and(eq(hostels.id, body.hostelId), eq(hostels.active, true))).limit(1);
      if (!hostel) return Response.json({ error: "Select an active hostel before adding a room." }, { status: 409 });
      const [room] = await db.insert(hostelRooms).values({
        hostelId: body.hostelId, roomNo: body.roomNo.trim().slice(0, 40), capacity: Number(body.capacity),
      }).returning();
      return Response.json(room, { status: 201 });
    }

    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100
      || !["male", "female"].includes(String(body.gender))) {
      return Response.json({ error: "Enter a hostel name and choose its resident eligibility." }, { status: 400 });
    }
    const name = body.name.trim();
    const gender = body.gender as "male" | "female";
    const expectedGender = knownHostels[name];
    if (expectedGender && expectedGender !== body.gender) {
      return Response.json({ error: `${name} is configured for ${expectedGender} residents.` }, { status: 400 });
    }
    const [hostel] = await db.insert(hostels).values({ name, gender }).returning();
    return Response.json(hostel, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return Response.json({ error: await error.text() }, { status: error.status });
    if (error instanceof Error && error.message.includes("unique")) {
      return Response.json({ error: "That hostel or room already exists." }, { status: 409 });
    }
    console.error("Hostel management failed:", error);
    return Response.json({ error: "Unable to save hostel information." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json() as Record<string, unknown>;
    const db = getDb();

    if (body.action === "update-hostel") {
      if (typeof body.id !== "string" || typeof body.active !== "boolean") {
        return Response.json({ error: "Select a hostel and its active status." }, { status: 400 });
      }
      const updated = await db.transaction(async (tx) => {
        const [hostel] = await tx.select().from(hostels).where(eq(hostels.id, body.id as string)).limit(1);
        if (!hostel) throw new Response("Hostel not found.", { status: 404 });
        await tx.execute(sql`SELECT id FROM hostel_rooms WHERE hostel_id = ${hostel.id} ORDER BY id FOR UPDATE`);
        if (!body.active) {
          const [occupied] = await tx.select({ value: count() }).from(roomAssignments)
            .where(and(eq(roomAssignments.active, true), eq(roomAssignments.hostel, hostel.name)));
          if (occupied.value > 0) throw new Response("A hostel with active residents cannot be deactivated.", { status: 409 });
        }
        const [result] = await tx.update(hostels).set({ active: body.active as boolean })
          .where(eq(hostels.id, hostel.id)).returning();
        return result;
      });
      return Response.json(updated);
    }

    if (body.action === "update-room") {
      if (typeof body.id !== "string" || !Number.isInteger(body.capacity)
        || Number(body.capacity) < 1 || Number(body.capacity) > 20
        || (body.active !== undefined && typeof body.active !== "boolean")) {
        return Response.json({ error: "Provide a room and capacity from 1 to 20." }, { status: 400 });
      }
      const updated = await db.transaction(async (tx) => {
        const [room] = await tx.select({
          roomId: hostelRooms.id, roomNo: hostelRooms.roomNo, hostelId: hostels.id,
          hostel: hostels.name,
        }).from(hostelRooms).innerJoin(hostels, eq(hostels.id, hostelRooms.hostelId))
          .where(eq(hostelRooms.id, body.id as string)).limit(1);
        if (!room) throw new Response("Room not found.", { status: 404 });
        await tx.execute(sql`SELECT id FROM hostel_rooms WHERE id = ${room.roomId} FOR UPDATE`);
        const [occupied] = await tx.select({ value: count() }).from(roomAssignments).where(and(
          eq(roomAssignments.active, true), or(
            eq(roomAssignments.roomId, room.roomId),
            and(isNull(roomAssignments.roomId), eq(roomAssignments.hostel, room.hostel), eq(roomAssignments.room, room.roomNo)),
          ),
        ));
        if (Number(body.capacity) < occupied.value) {
          throw new Response(`Capacity cannot be lower than the ${occupied.value} active resident(s).`, { status: 409 });
        }
        if (body.active === false && occupied.value > 0) {
          throw new Response("A room with active residents cannot be deactivated.", { status: 409 });
        }
        const [result] = await tx.update(hostelRooms).set({
          capacity: Number(body.capacity),
          ...(typeof body.active === "boolean" ? { active: body.active } : {}),
        }).where(eq(hostelRooms.id, room.roomId)).returning();
        return result;
      });
      return Response.json(updated);
    }

    return Response.json({ error: "Choose update-hostel or update-room." }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return Response.json({ error: await error.text() }, { status: error.status });
    console.error("Hostel update failed:", error);
    return Response.json({ error: "Unable to update hostel inventory." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== "string" || !["hostel", "room"].includes(String(body.kind))) {
      return Response.json({ error: "Select a hostel or room to remove." }, { status: 400 });
    }
    const db = getDb();
    if (body.kind === "room") {
      await db.transaction(async (tx) => {
        const [room] = await tx.select({
          roomId: hostelRooms.id, roomNo: hostelRooms.roomNo, hostel: hostels.name,
        }).from(hostelRooms).innerJoin(hostels, eq(hostels.id, hostelRooms.hostelId))
          .where(eq(hostelRooms.id, body.id as string)).limit(1);
        if (!room) throw new Response("Room not found.", { status: 404 });
        await tx.execute(sql`SELECT id FROM hostel_rooms WHERE id = ${room.roomId} FOR UPDATE`);
        const [occupied] = await tx.select({ value: count() }).from(roomAssignments).where(and(
          eq(roomAssignments.active, true), or(
            eq(roomAssignments.roomId, room.roomId),
            and(isNull(roomAssignments.roomId), eq(roomAssignments.hostel, room.hostel), eq(roomAssignments.room, room.roomNo)),
          ),
        ));
        if (occupied.value > 0) throw new Response("A room with active residents cannot be deleted.", { status: 409 });
        await tx.delete(hostelRooms).where(eq(hostelRooms.id, room.roomId));
      });
      return Response.json({ ok: true });
    }

    await db.transaction(async (tx) => {
      const [hostel] = await tx.select().from(hostels).where(eq(hostels.id, body.id as string)).limit(1);
      if (!hostel) throw new Response("Hostel not found.", { status: 404 });
      await tx.execute(sql`SELECT id FROM hostel_rooms WHERE hostel_id = ${hostel.id} ORDER BY id FOR UPDATE`);
      const [occupied] = await tx.select({ value: count() }).from(roomAssignments)
        .where(and(eq(roomAssignments.active, true), eq(roomAssignments.hostel, hostel.name)));
      if (occupied.value > 0) throw new Response("A hostel with active residents cannot be deleted.", { status: 409 });
      await tx.delete(hostels).where(eq(hostels.id, hostel.id));
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return Response.json({ error: await error.text() }, { status: error.status });
    console.error("Hostel deletion failed:", error);
    return Response.json({ error: "Unable to remove hostel inventory." }, { status: 500 });
  }
}