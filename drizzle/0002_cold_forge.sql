ALTER TYPE "public"."maintenance_status" ADD VALUE 'reported';--> statement-breakpoint
ALTER TYPE "public"."maintenance_status" ADD VALUE 'verified';--> statement-breakpoint
ALTER TYPE "public"."maintenance_status" ADD VALUE 'assigned';--> statement-breakpoint
ALTER TYPE "public"."maintenance_status" ADD VALUE 'resolved';--> statement-breakpoint
CREATE TABLE "booking_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"semester" text NOT NULL,
	"gender" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"hostel_id" uuid,
	"room_id" uuid,
	"confirmation_no" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "booking_applications_confirmation_no_unique" UNIQUE("confirmation_no")
);
--> statement-breakpoint
CREATE TABLE "gate_visitor_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"identifier" text NOT NULL,
	"gate" text NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"room_no" text NOT NULL,
	"capacity" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hostels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text NOT NULL,
	"proof_photo" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "assigned_staff" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "resolution_notes" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "report_photo" text;--> statement-breakpoint
ALTER TABLE "maintenance_requests" ADD COLUMN "resolution_photo" text;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "payment_id" uuid;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD COLUMN "room_id" uuid;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD COLUMN "qr_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_applications" ADD CONSTRAINT "booking_applications_room_id_hostel_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."hostel_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_rooms" ADD CONSTRAINT "hostel_rooms_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_booking_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."booking_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_applications_student_semester_idx" ON "booking_applications" USING btree ("student_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "hostel_rooms_hostel_room_idx" ON "hostel_rooms" USING btree ("hostel_id","room_no");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_method_reference_idx" ON "payments" USING btree ("method","reference");--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_application_id_booking_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."booking_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_application_id_booking_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."booking_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_room_id_hostel_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."hostel_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_unique" UNIQUE("payment_id");--> statement-breakpoint
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_qr_token_unique" UNIQUE("qr_token");