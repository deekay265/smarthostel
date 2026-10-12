"use client";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { useApiResource } from "@/components/hostel/useApiResource";
import { apiRequest } from "@/lib/api";
import { readImage } from "@/components/hostel/readImage";
import { useState } from "react";

type MaintenanceItem = { id: string; title: string; description: string; hostel: string; room: string; status: string; votes: number; verificationNotes: string | null; reportPhoto: string | null; assignedStaff: string | null; resolutionNotes: string | null; resolutionPhoto: string | null };
type Transfer = { transfer: { id: string; requestedHostel: string; requestedRoom: string; reason: string; status: string; reviewNotes: string | null }; studentName: string; regNo: string | null };
type Complaint = { id: string; location: string; message: string; status: string; submittedAt: string };

export default function IssuesPage() {
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [assignedStaff, setAssignedStaff] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolutionPhotos, setResolutionPhotos] = useState<Record<string, string>>({});
  const [transferNotes, setTransferNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState("");
  const maintenance = useApiResource<MaintenanceItem[]>("/api/hostel/maintenance");
  const transfers = useApiResource<Transfer[]>("/api/hostel/transfers");
  const complaints = useApiResource<Complaint[]>("/api/hostel/noise");

  async function update(resource: string, id: string, values: Record<string, string>) {
    setActionError("");
    try {
      await apiRequest(`/api/hostel/${resource}`, { method: "PATCH", body: JSON.stringify({ id, ...values }) });
      await Promise.all([maintenance.refresh(), transfers.refresh(), complaints.refresh()]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to update this record.";
      setActionError(message);
    }
  }

  return (
    <div className="grid">
      {actionError && <p role="alert" style={{ color: "var(--danger)" }}>{actionError}</p>}
      <h2 className="section-title">Maintenance verification</h2>
      {maintenance.error && <p role="alert" style={{ color: "var(--danger)" }}>{maintenance.error}</p>}
      {maintenance.data?.map((item) => (
        <Card key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong>{item.title}</strong><Badge status={item.status === "fixed" ? "success" : item.status === "open" ? "warning" : "info"}>{item.status}</Badge>
          </div>
          <p className="muted">{item.hostel} · {item.room} · {item.votes} votes</p>
          {item.description && <p style={{ marginTop: 6 }}>{item.description}</p>}
          {item.reportPhoto && <Image src={item.reportPhoto} alt={`Repair report: ${item.title}`} width={260} height={190} unoptimized style={{ maxWidth: 260, maxHeight: 190, objectFit: "cover", marginTop: 10 }} />}
          {item.verificationNotes && <p className="muted" style={{ marginTop: 6 }}>Verification: {item.verificationNotes}</p>}
          {item.assignedStaff && <p className="muted" style={{ marginTop: 6 }}>Assigned staff: {item.assignedStaff}</p>}
          {item.resolutionNotes && <p className="muted" style={{ marginTop: 6 }}>Resolution: {item.resolutionNotes}</p>}
          {item.resolutionPhoto && <Image src={item.resolutionPhoto} alt={`Completed repair: ${item.title}`} width={260} height={190} unoptimized style={{ maxWidth: 260, maxHeight: 190, objectFit: "cover", marginTop: 10 }} />}
          {item.status === "reported" && <textarea className="input" aria-label={`Verification notes for ${item.title}`} placeholder="Verification notes (optional)" value={verificationNotes[item.id] ?? ""} onChange={(event) => setVerificationNotes((notes) => ({ ...notes, [item.id]: event.target.value }))} rows={2} maxLength={2000} style={{ marginTop: 10 }} />}
          {item.status === "verified" && <Input aria-label={`Assigned staff for ${item.title}`} placeholder="Maintenance staff member" value={assignedStaff[item.id] ?? ""} onChange={(event) => setAssignedStaff((staff) => ({ ...staff, [item.id]: event.target.value }))} style={{ marginTop: 10 }} />}
          {item.status === "in-progress" && <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <textarea className="input" aria-label={`Resolution notes for ${item.title}`} placeholder="Resolution notes (or upload a completed photo)" value={resolutionNotes[item.id] ?? ""} onChange={(event) => setResolutionNotes((notes) => ({ ...notes, [item.id]: event.target.value }))} rows={2} maxLength={2000} />
            <Input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Completed repair photo for ${item.title}`} onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 700 * 1024) { setActionError("Choose an image no larger than 700 KB."); return; } try { const photo = await readImage(file); setResolutionPhotos((photos) => ({ ...photos, [item.id]: photo })); setActionError(""); } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to read repair photo."); } }} />
          </div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {(item.status === "reported" || item.status === "open") && <Button onClick={() => void update("maintenance", item.id, { status: "verified", notes: verificationNotes[item.id] ?? "" })}>Verify report</Button>}
            {item.status === "verified" && <Button onClick={() => void update("maintenance", item.id, { status: "assigned", assignedStaff: assignedStaff[item.id] ?? "" })}>Assign staff</Button>}
            {item.status === "assigned" && <Button onClick={() => void update("maintenance", item.id, { status: "in-progress" })}>Start repair</Button>}
            {item.status === "in-progress" && <Button onClick={() => void update("maintenance", item.id, { status: "resolved", resolutionNotes: resolutionNotes[item.id] ?? "", resolutionPhoto: resolutionPhotos[item.id] ?? "" })}>Mark resolved</Button>}
          </div>
        </Card>
      ))}
      {!maintenance.loading && !maintenance.data?.length && <p className="muted">No maintenance reports.</p>}

      <h2 className="section-title">Room transfer requests</h2>
      {transfers.error && <p role="alert" style={{ color: "var(--danger)" }}>{transfers.error}</p>}
      {transfers.data?.map(({ transfer, studentName, regNo }) => (
        <Card key={transfer.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div><strong>{studentName}</strong><p className="muted">{regNo} · Requested {transfer.requestedHostel} · {transfer.requestedRoom}</p></div><Badge status={transfer.status === "approved" ? "success" : transfer.status === "rejected" ? "danger" : "warning"}>{transfer.status}</Badge>
          </div>
          <p className="muted">{transfer.reason}</p>
          {(transfer.reviewNotes || transferNotes[transfer.id]) && <p className="muted">Office note: {transfer.reviewNotes || transferNotes[transfer.id]}</p>}
          {transfer.status === "pending" && <textarea className="input" aria-label={`Review notes for ${studentName}`} placeholder="Review notes (optional)" value={transferNotes[transfer.id] ?? ""} onChange={(event) => setTransferNotes((notes) => ({ ...notes, [transfer.id]: event.target.value }))} rows={2} maxLength={2000} style={{ marginTop: 8 }} />}
          {transfer.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Button onClick={() => void update("transfers", transfer.id, { status: "approved", notes: transferNotes[transfer.id] ?? "" })}>Approve</Button>
            <Button variant="danger" onClick={() => void update("transfers", transfer.id, { status: "rejected", notes: transferNotes[transfer.id] ?? "" })}>Reject</Button>
          </div>}
        </Card>
      ))}
      {!transfers.loading && !transfers.data?.length && <p className="muted">No transfer requests.</p>}

      <h2 className="section-title">Anonymous noise complaints</h2>
      {complaints.error && <p role="alert" style={{ color: "var(--danger)" }}>{complaints.error}</p>}
      {complaints.data?.map((complaint) => (
        <Card key={complaint.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong>{complaint.location}</strong><Badge status={complaint.status === "resolved" ? "success" : complaint.status === "reviewed" ? "info" : "warning"}>{complaint.status}</Badge>
          </div>
          <p style={{ marginTop: 8 }}>{complaint.message}</p>
          <p className="muted">{new Date(complaint.submittedAt).toLocaleString()} · Anonymous</p>
          {complaint.status === "open" && <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => void update("noise", complaint.id, { status: "reviewed" })}>Mark reviewed</Button>}
          {complaint.status !== "resolved" && <Button variant="ghost" style={{ marginTop: 8, marginLeft: 8 }} onClick={() => void update("noise", complaint.id, { status: "resolved" })}>Resolve</Button>}
        </Card>
      ))}
      {!complaints.loading && !complaints.data?.length && <p className="muted">No anonymous complaints received.</p>}
    </div>
  );
}
