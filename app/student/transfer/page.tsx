"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useApiResource } from "@/components/hostel/useApiResource";
import { apiRequest } from "@/lib/api";

type Transfer = {
  id: string; currentHostel: string; currentRoom: string;
  requestedHostel: string; requestedRoom: string; reason: string; status: string; reviewNotes: string | null;
};
type HostelOption = {
  id: string; name: string; gender: string;
  rooms: { id: string; roomNo: string; capacity: number; occupied: number }[];
};

export default function TransferPage() {
  const { data: items, loading, error, setError, refresh } = useApiResource<Transfer[]>("/api/hostel/transfers");
  const hostels = useApiResource<HostelOption[]>("/api/hostels");
  const [requestedHostelId, setRequestedHostelId] = useState("");
  const [requestedRoomId, setRequestedRoomId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedHostel = hostels.data?.find((hostel) => hostel.id === requestedHostelId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/hostel/transfers", {
        method: "POST", body: JSON.stringify({ requestedHostelId, requestedRoomId, reason }),
      });
      setRequestedHostelId(""); setRequestedRoomId(""); setReason("");
      await Promise.all([refresh(), hostels.refresh()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit the request.");
    } finally { setSaving(false); }
  }

  return (
    <div className="grid">
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Request a room transfer</h2>
        <p className="muted" style={{ marginBottom: 10 }}>Transfer requests are reviewed by the hostel office. An approved request updates your room assignment.</p>
        <form onSubmit={(event) => void submit(event)} style={{ display: "grid", gap: 10 }}>
          <select className="input" aria-label="Requested hostel" value={requestedHostelId} onChange={(event) => { setRequestedHostelId(event.target.value); setRequestedRoomId(""); }} required>
            <option value="">Select eligible hostel</option>{hostels.data?.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name}</option>)}
          </select>
          <select className="input" aria-label="Available room" value={requestedRoomId} onChange={(event) => setRequestedRoomId(event.target.value)} required disabled={!selectedHostel?.rooms.length}>
            <option value="">Select available room</option>{selectedHostel?.rooms.map((room) => <option key={room.id} value={room.id}>Room {room.roomNo} · {room.capacity - room.occupied} bed(s) available</option>)}
          </select>
          {hostels.error && <p role="alert" style={{ color: "var(--danger)" }}>{hostels.error}</p>}
          <textarea className="input" placeholder="Reason for transfer" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required maxLength={3000} />
          <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit transfer request"}</Button>
        </form>
      </Card>
      {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
      <h2 className="section-title">Your requests</h2>
      {loading && <p className="muted">Loading requests…</p>}
      {!loading && !items?.length && <p className="muted">You have not requested a transfer.</p>}
      {items?.map((item) => (
        <Card key={item.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <strong>{item.currentHostel} {item.currentRoom} → {item.requestedHostel} {item.requestedRoom}</strong>
            <Badge status={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "warning"}>{item.status}</Badge>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>{item.reason}</p>
          {item.reviewNotes && <p className="muted" style={{ marginTop: 6 }}>Office note: {item.reviewNotes}</p>}
        </Card>
      ))}
    </div>
  );
}
