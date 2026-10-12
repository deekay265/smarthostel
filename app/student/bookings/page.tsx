"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useApiResource } from "@/components/hostel/useApiResource";
import { apiRequest } from "@/lib/api";

type BookingRow = {
  application: { id: string; semester: string; status: string; confirmationNo: string | null; submittedAt: string };
  hostelName: string | null; roomNo: string | null;
};

export default function StudentBookingsPage() {
  const bookings = useApiResource<BookingRow[]>("/api/bookings");
  const [semester, setSemester] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function apply(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await apiRequest("/api/bookings", { method: "POST", body: JSON.stringify({ semester }) });
      setSemester(""); await bookings.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your application.");
    } finally { setSaving(false); }
  }

  const hasPending = bookings.data?.some(({ application }) => application.status === "pending");
  return (
    <div className="grid">
      <div className="page-intro"><div><div className="page-eyebrow">Accommodation</div><h2 className="page-heading">Semester booking</h2><p className="page-description">Apply for a room, follow your application, and keep your allocation confirmation handy.</p></div></div>
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>New application</h2>
        <form onSubmit={(event) => void apply(event)} style={{ display: "grid", gap: 10 }}>
          <input className="input" aria-label="Semester" placeholder="e.g. 2026/2027 Semester 1" value={semester} onChange={(event) => setSemester(event.target.value)} maxLength={80} required />
          {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
          <Button type="submit" disabled={saving || hasPending}>{saving ? "Submitting…" : "Submit application"}</Button>
        </form>
      </Card>
      {bookings.error && <p role="alert" style={{ color: "var(--danger)" }}>{bookings.error}</p>}
      <h2 className="section-title">Your applications</h2>
      {bookings.data?.map(({ application, hostelName, roomNo }) => {
        const status = application.status;
        return <Card key={application.id}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div><strong>{application.semester}</strong><p className="muted">Submitted {new Date(application.submittedAt).toLocaleDateString()}</p></div>
            <Badge status={status === "approved" ? "success" : status === "rejected" ? "danger" : status === "waitlisted" ? "info" : "warning"}>{status}</Badge>
          </div>
          {status === "approved" && <div style={{ marginTop: 16 }}>
            <p><strong>{hostelName}</strong> · Room {roomNo}</p><p className="muted" style={{ marginTop: 5 }}>Allocation confirmation ticket</p><p style={{ fontFamily: "monospace", marginTop: 5 }}>{application.confirmationNo}</p>
          </div>}
        </Card>;
      })}
      {!bookings.loading && !bookings.data?.length && <p className="muted">No applications yet.</p>}
    </div>
  );
}