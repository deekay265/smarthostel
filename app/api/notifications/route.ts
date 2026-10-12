import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/server-auth";

export async function GET() {
  try {
    const user = await requireUser("student");
    return Response.json(await getDb().select().from(notifications)
      .where(eq(notifications.studentId, user.id)).orderBy(desc(notifications.createdAt)).limit(20));
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to load notifications." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser("student");
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== "string") return Response.json({ error: "A notification id is required." }, { status: 400 });
    const [updated] = await getDb().update(notifications).set({ readAt: new Date() }).where(and(
      eq(notifications.id, body.id), eq(notifications.studentId, user.id),
    )).returning();
    if (!updated) return Response.json({ error: "Notification not found." }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error instanceof Response ? await error.text() : "Unable to update notification." }, {
      status: error instanceof Response ? error.status : 500,
    });
  }
}