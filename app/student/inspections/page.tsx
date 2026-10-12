"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api";
import { useApiResource } from "@/components/hostel/useApiResource";
import { readImage } from "@/components/hostel/readImage";
import Image from "next/image";

type Inspection = { id: string; assignmentId: string | null; type: string; notes: string; photos: string[]; submittedAt: string; aiStatus: string; aiAssessment: string | null };
type Assignment = { id: string; hostel: string; room: string } | null;

export default function InspectionsPage() {
  const { data: items, loading, error, setError, refresh } = useApiResource<Inspection[]>("/api/hostel/inspections");
  const assignment = useApiResource<Assignment>("/api/hostel/assignment");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadKey, setUploadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const currentInspections = items?.filter((item) => item.assignmentId === assignment.data?.id) ?? [];
  const hasBaseline = currentInspections.some((item) => item.type === "check-in");
  const hasCheckout = currentInspections.some((item) => item.type === "check-out");
  const type: "check-in" | "check-out" | null = !hasBaseline ? "check-in" : !hasCheckout ? "check-out" : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      if (photos.length < 1 || photos.length > 4 || photos.some((file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 700_000)) {
        throw new Error("Upload 1–4 JPEG, PNG, or WebP photos, each no larger than 700 KB.");
      }
      const images = await Promise.all(photos.map(readImage));
      if (!type) throw new Error("Both inspection records for this room assignment have been submitted.");
      await apiRequest("/api/hostel/inspections", {
        method: "POST", body: JSON.stringify({ type, notes, photos: images }),
      });
      setNotes(""); setPhotos([]); setUploadKey((key) => key + 1);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit inspection.");
    } finally { setSaving(false); }
  }

  return (
    <div className="grid">
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Room condition record</h2>
        <p className="muted" style={{ marginBottom: 10 }}>
          {type === "check-in" ? "Move-in baseline: photograph the room before settling in, including walls, furniture, windows, and existing damage." : type === "check-out" ? "End-of-semester check-out: photograph the same areas so the office can compare condition with your move-in baseline." : "Move-in and end-of-semester inspection records are complete for this room."}
        </p>
        <form onSubmit={(event) => void submit(event)} style={{ display: "grid", gap: 10 }}>
          {type && <Badge status={type === "check-in" ? "info" : "warning"}>{type === "check-in" ? "Move-in baseline" : "End-of-semester checkout"}</Badge>}
          {assignment.data && <p className="muted">{assignment.data.hostel} · Room {assignment.data.room}</p>}
          {assignment.error && <p role="alert" style={{ color: "var(--danger)" }}>{assignment.error}</p>}
          <textarea className="input" placeholder="Room condition and any existing damage" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} required maxLength={3000} />
          <input key={uploadKey} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setPhotos(Array.from(event.target.files ?? []))} required />
          {photos.length > 0 && <p className="muted">{photos.length} photo(s) selected</p>}
          {photos.length > 4 && <p role="alert" style={{ color: "var(--danger)" }}>Select no more than four photos.</p>}
          {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
          <Button type="submit" disabled={saving || photos.length === 0 || !type || !assignment.data}>{saving ? "Saving…" : type === "check-in" ? "Save move-in baseline" : type === "check-out" ? "Save semester checkout" : "Inspection complete"}</Button>
        </form>
      </Card>
      <h2 className="section-title">Your inspection history</h2>
      {loading && <p className="muted">Loading inspections…</p>}
      {!loading && !items?.length && <p className="muted">No inspections submitted yet.</p>}
      {items?.map((item) => (
        <Card key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong>{item.type.replace("-", " ")} inspection</strong>
            <Badge status="info">{new Date(item.submittedAt).toLocaleDateString()}</Badge>
          </div>
          <p className="muted" style={{ margin: "8px 0" }}>{item.notes}</p>
          {item.type === "check-out" && <div style={{ margin: "8px 0", padding: 12, borderLeft: "3px solid var(--accent)", background: "var(--primary-light)" }}><strong>AI damage comparison · {item.aiStatus}</strong><p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 5 }}>{item.aiAssessment ?? (item.aiStatus === "not-configured" ? "Groq is not configured; hostel staff can review the photos manually." : "No AI assessment available.")}</p></div>}
          <div className="grid grid-2">
            {item.photos.map((photo, index) => (
              <Image key={`${item.id}-${index}`} unoptimized width={640} height={360} src={photo} alt={`Inspection photo ${index + 1}`} style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "cover", borderRadius: 8 }} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
