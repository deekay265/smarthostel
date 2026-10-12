import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { gateVisitorEvents } from "@/lib/db/schema";
import { requireUser } from "@/lib/server-auth";

export async function GET() {
  try {
    await requireUser("admin");
    return Response.json(await getDb().select().from(gateVisitorEvents)
      .orderBy(desc(gateVisitorEvents.eventAt)).limit(50));
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to load visitor entries." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}

export async function POST(request: Request) {
  try {
    await requireUser("admin");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.fullName !== "string" || body.fullName.trim().length < 2 || body.fullName.length > 150
      || typeof body.identifier !== "string" || body.identifier.trim().length < 3 || body.identifier.length > 100) {
      return Response.json({ error: "Enter the visitor's full name and identification number." }, { status: 400 });
    }
    const [event] = await getDb().insert(gateVisitorEvents).values({
      fullName: body.fullName.trim(), identifier: body.identifier.trim(),
      gate: typeof body.gate === "string" ? body.gate.trim().slice(0, 150) || "Hostel gate" : "Hostel gate",
    }).returning();
    return Response.json(event, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to record the visitor entry." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}