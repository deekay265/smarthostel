import { createHmac } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { hostels } from "@/lib/db/schema";
import { requireUser } from "@/lib/server-auth";

export async function GET() {
  try {
    await requireUser("admin");
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not configured.");
    const rows = await getDb().select({ id: hostels.id, name: hostels.name })
      .from(hostels).where(eq(hostels.active, true)).orderBy(asc(hostels.name));
    return Response.json(rows.map((hostel) => {
      const signature = createHmac("sha256", secret).update(`mubas-hostel-gate:v1:${hostel.id}`).digest("hex");
      return { id: hostel.id, name: hostel.name, code: `MUBAS-GATE:${hostel.id}:${signature}` };
    }));
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to create the gate QR code." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}