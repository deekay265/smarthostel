# MUBAS Smart Hostels

Student residence operations portal built with Next.js, Drizzle ORM, and PostgreSQL.

## Setup

1. Install the dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string. Set `SESSION_SECRET` to a long, random value. Configure the `SEED_ADMIN_PASSWORD`; configure the `SEED_STUDENT_PASSWORD` if you want a student account created at seed time.
3. Apply checked-in database migrations with `npm run db:migrate`. Generate a new migration after schema changes with `npm run db:generate`, review the SQL, and apply it with `npm run db:migrate`. Avoid `npm run db:push` on populated databases because Drizzle may request destructive table truncation to add constraints.
4. Create the configured initial account(s) with `npm run db:seed`.
5. Start the app with `npm run dev`.

The initial administrator email defaults to `admin@mubas.ac.mw`. The password is taken from `SEED_ADMIN_PASSWORD`, not hard-coded. The optional student account defaults to `student@mubas.ac.mw` and is only created when `SEED_STUDENT_PASSWORD` is set. After starting the app, `GET /api/health` reports whether PostgreSQL is configured and reachable.

`npm run db:generate` generates SQL migrations in `drizzle/`; `npm run db:migrate` applies those migrations while preserving existing records.

## Included workflows

- Student login with a signed, HTTP-only session cookie and hostel-office credential issuance with verified hostel eligibility.
- Student semester booking applications with pending, approved, rejected, and waitlisted statuses; admins can allocate the next eligible bed, producing a confirmation ticket.
- Admin-managed hostels and rooms with capacity and live occupied/available bed counts. The named hostel eligibility is Nyika, Mpingwe, and Ndirande A for male residents; Hyrid, Kapeni, and Ndirande B for female residents.
- A separately signed and printable/downloadable A4 gate QR poster for each active hostel; student-side webcam scans are rejected unless that student is assigned to the scanned hostel.
- One move-in room inspection and one end-of-semester checkout photo record per room assignment; checkout photos are compared against the move-in baseline with Groq vision when configured.
- Student payment reference and proof submissions linked to an approved booking, followed by admin verification and admin-only receipt issuance.
- Public receipt tracking-number verification and browser print / Save as PDF support.
- Student repair reports with required photos and a visible reported, verified, assigned, in-progress, resolved workflow, including staff, resolution evidence, and in-app student update notifications.
- Room transfer requests; approval changes the student's active room assignment.
- Anonymous noise complaint submission and administrator review.
- Lost-and-found listings, photo attachments, and student item claims.
- Administrator views for students, inspection submissions, pending work, and receipts.

The anonymous complaint endpoint deliberately does not associate a complaint with an account. Inspection, payment proof, and repair photos are stored as data URLs in PostgreSQL (up to four images of 700 KB each for an inspection); plan external object storage if the deployment needs larger photo volumes. Camera scanning requires browser camera permission and a secure context (HTTPS or localhost). Set `GROQ_API_KEY` in the server environment to enable AI comparisons; `GROQ_VISION_MODEL` can override the default vision model. Without a key, photos are retained and marked for manual review. AI output is advisory and must not be used alone to charge a student.

## API resources

- `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/logout`
- `/api/hostels`, `/api/bookings`, `/api/payments`, `/api/gate/code`, `/api/gate/scan`, `/api/gate/visitors`, `/api/notifications`
- `GET /api/receipts/verify?number=...` for public receipt verification
- `/api/hostel/assignment`, `/api/hostel/checkins`, `/api/hostel/inspections`
- `/api/hostel/receipts`, `/api/hostel/maintenance`, `/api/hostel/transfers`
- `/api/hostel/noise`, `/api/hostel/lost-found`, `/api/hostel/students`, `/api/hostel/summary`
- `GET` and `POST /api/admin/credentials` for office-issued student accounts

Authenticated endpoints enforce the user role on the server. The database must be reachable and migrated before authenticated portal data can load.
