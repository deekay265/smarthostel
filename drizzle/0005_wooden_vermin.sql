ALTER TABLE "room_inspections" ADD COLUMN "assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "room_inspections" ADD COLUMN "ai_status" text DEFAULT 'not-configured' NOT NULL;--> statement-breakpoint
ALTER TABLE "room_inspections" ADD COLUMN "ai_assessment" text;--> statement-breakpoint
ALTER TABLE "room_inspections" ADD COLUMN "ai_assessed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "room_inspections" ADD CONSTRAINT "room_inspections_assignment_id_room_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."room_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_inspections_assignment_type_idx" ON "room_inspections" USING btree ("assignment_id","type");