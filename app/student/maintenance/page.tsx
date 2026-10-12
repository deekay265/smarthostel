"use client";
import Image from "next/image";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api";
import { readImage } from "@/components/hostel/readImage";
import { useApiResource } from "@/components/hostel/useApiResource";

type RequestItem = {
  id: string; title: string; description: string; hostel: string; room: string;
  votes: number; votedByMe: boolean; status: string; reportPhoto: string | null;
  assignedStaff: string | null; resolutionNotes: string | null; resolutionPhoto: string | null;
};
type Notification = { id: string; title: string; message: string; readAt: string | null; createdAt: string };

export default function MaintenancePage() {
  const { data: items, loading, error, setError, refresh } = useApiResource<RequestItem[]>("/api/hostel/maintenance");
  const updates = useApiResource<Notification[]>("/api/notifications");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);

  async function report(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/hostel/maintenance", {
        method: "POST", body: JSON.stringify({ title, description, photo }),
      });
      setTitle("");
      setDescription("");
      setPhoto("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit the report.");
    } finally {
      setSaving(false);
    }
  }

  async function vote(id: string) {
    setError("");
    try {
      await apiRequest("/api/hostel/maintenance", {
        method: "PATCH", body: JSON.stringify({ id, action: "vote" }),
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your vote.");
    }
  }

  async function markRead(id: string) {
    try {
      await apiRequest("/api/notifications", { method: "PATCH", body: JSON.stringify({ id }) });
      await updates.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update notification.");
    }
  }

  const badgeStatus = (status: string) =>
    status === "resolved" || status === "fixed" ? "success" : status === "in-progress" || status === "assigned" ? "info" : status === "verified" ? "neutral" : "warning";

  return (
    <div className="grid">
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Report a maintenance issue</h2>
        <form onSubmit={(event) => void report(event)} style={{ display: "grid", gap: 10 }}>
          <Input placeholder="Issue title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={250} />
          <textarea className="input" placeholder="Details (optional)" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={3000} />
          <Input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Repair report photo" required onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 700 * 1024) { setError("Choose an image no larger than 700 KB."); return; } try { setPhoto(await readImage(file)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to read image."); } }} />
          <Button type="submit" disabled={saving || !photo}>{saving ? "Submitting…" : "Submit report"}</Button>
        </form>
        <p className="muted" style={{ marginTop: 10 }}>Issues include your assigned hostel and room. Students can vote to prioritize repairs.</p>
      </Card>
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Repair updates</h2>
        {updates.error && <p role="alert" style={{ color: "var(--danger)" }}>{updates.error}</p>}
        {updates.data?.map((notification) => (
          <div key={notification.id} className="activity-row" style={{ justifyContent: "space-between", gap: 12 }}>
            <div><strong>{notification.title}</strong><p className="muted">{notification.message}</p><p className="muted">{new Date(notification.createdAt).toLocaleString()}</p></div>
            {!notification.readAt && <Button variant="ghost" onClick={() => void markRead(notification.id)}>Mark read</Button>}
          </div>
        ))}
        {!updates.loading && !updates.data?.length && <p className="muted">No repair updates yet.</p>}
      </Card>
      {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      {loading && <p className="muted">Loading maintenance requests…</p>}
      {items?.map((item) => (
        <Card key={item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button aria-label={`${item.votedByMe ? "Remove vote from" : "Vote for"} ${item.title}`} onClick={() => void vote(item.id)} style={{
            border: `2px solid ${item.votedByMe ? "var(--primary)" : "var(--border)"}`,
            background: item.votedByMe ? "var(--primary-light)" : "var(--surface)",
            borderRadius: 12, padding: "8px 12px", textAlign: "center", minWidth: 56,
          }}>
            <div style={{ fontWeight: 800, color: "var(--primary)" }}>{item.votes}</div>
            <div style={{ fontSize: ".65rem", color: "var(--text-muted)" }}>votes</div>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{item.title}</div>
            {item.description && <div className="muted">{item.description}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
              <span className="muted">{item.hostel} · {item.room}</span>
              <Badge status={badgeStatus(item.status)}>{item.status}</Badge>
            </div>
            {item.reportPhoto && <Image src={item.reportPhoto} alt={`Repair report: ${item.title}`} width={240} height={180} unoptimized style={{ maxWidth: 240, maxHeight: 180, objectFit: "cover", marginTop: 10 }} />}
            {item.assignedStaff && <p className="muted" style={{ marginTop: 6 }}>Assigned to {item.assignedStaff}</p>}
            {item.resolutionNotes && <p className="muted" style={{ marginTop: 6 }}>Resolution: {item.resolutionNotes}</p>}
            {item.resolutionPhoto && <Image src={item.resolutionPhoto} alt={`Completed repair: ${item.title}`} width={240} height={180} unoptimized style={{ maxWidth: 240, maxHeight: 180, objectFit: "cover", marginTop: 10 }} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
