"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useApiResource } from "@/components/hostel/useApiResource";
import { apiRequest } from "@/lib/api";

type Application = {
  application: { id: string; semester: string; gender: string; status: string; submittedAt: string; confirmationNo: string | null };
  studentName: string; regNo: string | null; hostelName: string | null; roomNo: string | null;
};

export default function AdminBookingsPage() {
  const applications = useApiResource<Application[]>("/api/bookings");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function decide(id: string, status: "approved" | "rejected" | "waitlisted") {
    setBusyId(id); setError("");
    try {
      await apiRequest("/api/bookings", { method: "PATCH", body: JSON.stringify({ id, status }) });
      await applications.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review this application.");
    } finally { setBusyId(""); }
  }

  return <div className="grid">
    <div className="page-intro"><div><div className="page-eyebrow">Administration</div><h2 className="page-heading">Booking applications</h2><p className="page-description">Review student eligibility and allocate the next available bed in a matching hostel.</p></div></div>
    {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
    {applications.error && <p role="alert" style={{ color: "var(--danger)" }}>{applications.error}</p>}
    {applications.data?.map(({ application, studentName, regNo, hostelName, roomNo }) => {
      const pending = application.status === "pending" || application.status === "waitlisted";
      return <Card key={application.id}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div><strong>{studentName}</strong><p className="muted">{regNo ?? "No registration number"} · {application.semester}</p></div>
          <Badge status={application.status === "approved" ? "success" : application.status === "rejected" ? "danger" : application.status === "waitlisted" ? "info" : "warning"}>{application.status}</Badge>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Eligibility: {application.gender} · Applied {new Date(application.submittedAt).toLocaleDateString()}</p>
        {application.status === "approved" && <p style={{ marginTop: 8 }}>{hostelName} · Room {roomNo} · Ticket {application.confirmationNo}</p>}
        {pending && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Button disabled={busyId === application.id} onClick={() => void decide(application.id, "approved")}>Allocate next available bed</Button>
          <Button variant="ghost" disabled={busyId === application.id} onClick={() => void decide(application.id, "waitlisted")}>Waitlist</Button>
          <Button variant="danger" disabled={busyId === application.id} onClick={() => void decide(application.id, "rejected")}>Reject</Button>
        </div>}
      </Card>;
    })}
    {!applications.loading && !applications.data?.length && <p className="muted">No booking applications to review.</p>}
  </div>;
}