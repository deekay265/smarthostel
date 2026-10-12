import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookingApplications, receipts } from "@/lib/db/schema";

export async function GET(request: Request) {
  const trackingNo = new URL(request.url).searchParams.get("number")?.trim();
  if (!trackingNo || trackingNo.length > 80) return Response.json({ error: "Enter a valid receipt tracking number." }, { status: 400 });
  try {
    const [result] = await getDb().select({
      receipt: receipts,
      semester: bookingApplications.semester,
    }).from(receipts).leftJoin(bookingApplications, eq(bookingApplications.id, receipts.applicationId))
      .where(and(eq(receipts.trackingNo, trackingNo), eq(receipts.status, "verified"))).limit(1);
    if (!result) return Response.json({ error: "No verified receipt matches that tracking number." }, { status: 404 });
    return Response.json({
      valid: true, trackingNo: result.receipt.trackingNo, semester: result.semester,
      amount: result.receipt.amount, method: result.receipt.method, paidAt: result.receipt.paidAt,
    });
  } catch {
    return Response.json({ error: "Unable to verify this receipt." }, { status: 500 });
  }
}