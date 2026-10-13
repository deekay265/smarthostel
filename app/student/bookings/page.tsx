"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useApiResource } from "@/components/hostel/useApiResource";
import { apiRequest } from "@/lib/api";
import { mkw } from "@/lib/format";

type BookingRow = {
  application: { id: string; semester: string; academicYear: string | null; status: string; confirmationNo: string | null; submittedAt: string };
  hostelName: string | null;
  roomNo: string | null;
};
type BookingWindow = {
  settings: { academicYear: string; opensAt: string; closesAt: string; monthlyRent: number } | null;
  isOpen: boolean;
  alreadyBooked: boolean;
  student: { bankAccountNo: string | null; regNo: string | null; gender: string | null };
  payment: { status: "paid" | "unpaid" | "amount-mismatch"; amount: number | null; reference?: string; paidAt?: string };
};

export default function StudentBookingsPage() {
  const bookings = useApiResource<BookingRow[]>("/api/bookings");
  const bookingWindow = useApiResource<BookingWindow>("/api/booking-window");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function book() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ emailSent: boolean }>("/api/bookings", { method: "POST" });
      await Promise.all([bookings.refresh(), bookingWindow.refresh()]);
      setNotice(result.emailSent
        ? "Your booking is approved and the confirmation email has been sent."
        : "Your booking is approved. Email delivery is not configured; save the confirmation shown below.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete your booking.");
      await bookingWindow.refresh();
    } finally {
      setSaving(false);
    }
  }

  const windowData = bookingWindow.data;
  const eligible = Boolean(windowData?.student.regNo && ["male", "female"].includes(windowData.student.gender ?? ""));
  const canBook = Boolean(windowData?.isOpen && windowData.payment.status === "paid"
    && !windowData.alreadyBooked && eligible);

  return (
    <div className="grid">
      <div className="page-intro"><div><div className="page-eyebrow">Accommodation</div><h2 className="page-heading">Hostel booking</h2><p className="page-description">Check your hostel rent status, then book once the office opens the booking window.</p></div></div>
      {bookingWindow.error && <p role="alert" style={{ color: "var(--danger)" }}>{bookingWindow.error}</p>}
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Booking and payment status</h2>
        {bookingWindow.loading && <p className="muted">Loading booking details…</p>}
        {windowData?.settings ? <>
          <p><strong>Academic year:</strong> {windowData.settings.academicYear}</p>
          <p style={{ marginTop: 6 }}><strong>Booking window:</strong> <Badge status={windowData.isOpen ? "success" : "warning"}>{windowData.isOpen ? "Open" : "Closed"}</Badge></p>
          <p className="muted" style={{ marginTop: 6 }}>
            {new Date(windowData.settings.opensAt).toLocaleString()} – {new Date(windowData.settings.closesAt).toLocaleString()}
          </p>
          <p style={{ marginTop: 12 }}><strong>Hostel rent:</strong> {mkw(windowData.settings.monthlyRent)}</p>
          <p style={{ marginTop: 6 }}>
            <strong>Bank payment:</strong>{" "}
            <Badge status={windowData.payment.status === "paid" ? "success" : windowData.payment.status === "amount-mismatch" ? "danger" : "warning"}>{windowData.payment.status}</Badge>
          </p>
          {windowData.payment.status === "paid" && <p className="muted" style={{ marginTop: 5 }}>Reference {windowData.payment.reference} · Recorded {new Date(windowData.payment.paidAt!).toLocaleString()}</p>}
          {windowData.payment.status === "unpaid" && <p className="muted" style={{ marginTop: 5 }}>Your booking can proceed once your bank payment is recorded by the hostel office&apos;s simulator.</p>}
          {windowData.payment.status === "amount-mismatch" && <p className="muted" style={{ marginTop: 5 }}>The recorded bank payment does not match the current rent. Contact the hostel office.</p>}
          <p style={{ marginTop: 10 }}><strong>Your bank account number:</strong> <span style={{ fontFamily: "monospace" }}>{windowData.student.bankAccountNo ?? "Not assigned — contact the hostel office"}</span></p>
          {!eligible && <p role="alert" style={{ color: "var(--danger)", marginTop: 8 }}>Your student eligibility details are incomplete. Contact the hostel office.</p>}
          {windowData.alreadyBooked && <p className="muted" style={{ marginTop: 8 }}>You already have an approved booking for this academic year.</p>}
          {windowData.payment.status === "unpaid" && <Button variant="ghost" onClick={() => void bookingWindow.refresh()} disabled={bookingWindow.loading} style={{ marginTop: 10 }}>Refresh payment status</Button>}
          <Button onClick={() => void book()} disabled={saving || bookingWindow.loading || !canBook} style={{ marginTop: 12 }}>
            {saving ? "Checking and booking…" : "Book hostel"}
          </Button>
        </> : !bookingWindow.loading && <p className="muted">The hostel office has not configured a booking window yet.</p>}
        {error && <p role="alert" style={{ color: "var(--danger)", marginTop: 10 }}>{error}</p>}
        {notice && <p role="status" style={{ color: "var(--success, var(--primary))", marginTop: 10 }}>{notice}</p>}
      </Card>
      {bookings.error && <p role="alert" style={{ color: "var(--danger)" }}>{bookings.error}</p>}
      <h2 className="section-title">Your bookings</h2>
      {bookings.data?.map(({ application, hostelName, roomNo }) => {
        const status = application.status;
        return <Card key={application.id}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div><strong>{application.semester}</strong><p className="muted">Booked {new Date(application.submittedAt).toLocaleDateString()}</p></div>
            <Badge status={status === "approved" ? "success" : status === "rejected" ? "danger" : status === "waitlisted" ? "info" : "warning"}>{status}</Badge>
          </div>
          {status === "approved" && <div style={{ marginTop: 16 }}>
            <p><strong>{hostelName}</strong> · Room {roomNo}</p>
            <p className="muted" style={{ marginTop: 5 }}>Allocation confirmation ticket</p>
            <p style={{ fontFamily: "monospace", marginTop: 5 }}>{application.confirmationNo}</p>
          </div>}
        </Card>;
      })}
      {!bookings.loading && !bookings.data?.length && <p className="muted">No bookings yet.</p>}
    </div>
  );
}
