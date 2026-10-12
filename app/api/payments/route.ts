import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookingApplications, payments, receipts, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/server-auth";

const methods = ["Airtel Money", "TNM Mpamba", "Bank"] as const;

export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    if (user.role === "admin") {
      return Response.json(await db.select({
        payment: payments, studentName: users.name, regNo: users.regNo,
        semester: bookingApplications.semester, confirmationNo: bookingApplications.confirmationNo,
        receiptId: receipts.id,
      }).from(payments).innerJoin(users, eq(users.id, payments.studentId))
        .innerJoin(bookingApplications, eq(bookingApplications.id, payments.applicationId))
        .leftJoin(receipts, eq(receipts.paymentId, payments.id))
        .orderBy(desc(payments.submittedAt)));
    }
    return Response.json(await db.select({
      payment: payments, semester: bookingApplications.semester,
      confirmationNo: bookingApplications.confirmationNo,
    }).from(payments).innerJoin(bookingApplications, eq(bookingApplications.id, payments.applicationId))
      .where(eq(payments.studentId, user.id)).orderBy(desc(payments.submittedAt)));
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to load payment records." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("student");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.applicationId !== "string" || !Number.isInteger(body.amount) || Number(body.amount) < 1
      || !methods.includes(body.method as typeof methods[number])
      || typeof body.reference !== "string" || body.reference.trim().length < 3 || body.reference.length > 150
      || typeof body.proofPhoto !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(body.proofPhoto) || body.proofPhoto.length > 950_000) {
      return Response.json({ error: "Select an allocated booking, enter the payment amount and reference, and upload proof (JPEG, PNG, or WebP, max 700 KB)." }, { status: 400 });
    }
    const db = getDb();
    const [application] = await db.select().from(bookingApplications).where(and(
      eq(bookingApplications.id, body.applicationId), eq(bookingApplications.studentId, user.id),
      eq(bookingApplications.status, "approved"),
    )).limit(1);
    if (!application) return Response.json({ error: "Only an approved booking can be linked to a payment submission." }, { status: 409 });
    const [payment] = await db.insert(payments).values({
      studentId: user.id, applicationId: application.id, amount: Number(body.amount),
      method: body.method as typeof methods[number], reference: body.reference.trim(), proofPhoto: body.proofPhoto,
    }).returning();
    return Response.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return Response.json({ error: await error.text() }, { status: error.status });
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return Response.json({ error: "That payment method and reference have already been submitted." }, { status: 409 });
    }
    console.error("Payment proof submission failed:", error);
    return Response.json({ error: "Unable to submit payment proof." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== "string" || !["verified", "rejected"].includes(String(body.status))) {
      return Response.json({ error: "Choose a payment and a valid verification status." }, { status: 400 });
    }
    const db = getDb();
    const updated = await db.transaction(async (tx) => {
      const [payment] = await tx.update(payments).set({
        status: body.status as string, verifiedAt: new Date(),
      }).where(and(eq(payments.id, body.id as string), eq(payments.status, "pending"))).returning();
      if (!payment) throw new Response("Payment not found or already reviewed.", { status: 409 });
      if (payment.status === "verified") {
        const [application] = await tx.select().from(bookingApplications)
          .where(and(eq(bookingApplications.id, payment.applicationId), eq(bookingApplications.status, "approved"))).limit(1);
        if (!application) throw new Response("The linked booking is no longer approved.", { status: 409 });
      }
      return payment;
    });
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to verify payment proof." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}