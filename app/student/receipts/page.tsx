"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { apiRequest } from "@/lib/api";
import { readImage } from "@/components/hostel/readImage";
import { useApiResource } from "@/components/hostel/useApiResource";
import { mkw } from "@/lib/format";

type Receipt = { id: string; trackingNo: string; amount: number; method: string; paidAt: string; status: string };
type BookingRow = { application: { id: string; semester: string; status: string } };
type PaymentRow = { payment: { id: string; amount: number; method: string; reference: string; status: string }; semester: string };

export default function ReceiptsPage() {
  const receipts = useApiResource<Receipt[]>("/api/hostel/receipts");
  const bookings = useApiResource<BookingRow[]>("/api/bookings");
  const payments = useApiResource<PaymentRow[]>("/api/payments");
  const [applicationId, setApplicationId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Airtel Money");
  const [reference, setReference] = useState("");
  const [proofPhoto, setProofPhoto] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await apiRequest("/api/payments", { method: "POST", body: JSON.stringify({
        applicationId, amount: Number(amount), method, reference, proofPhoto,
      }) });
      setAmount(""); setReference(""); setProofPhoto("");
      await payments.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to submit payment proof."); }
    finally { setSaving(false); }
  }
  return (
    <div className="grid">
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Submit payment proof</h2>
        <p className="muted" style={{ marginBottom: 12 }}>Make your payment through Airtel Money, TNM Mpamba, or bank, then submit its reference for office verification. This portal does not initiate payments.</p>
        <form onSubmit={(event) => void submitPayment(event)} style={{ display: "grid", gap: 10 }}>
          <select className="input" aria-label="Allocated booking" value={applicationId} onChange={(event) => setApplicationId(event.target.value)} required>
            <option value="">Select approved booking</option>{bookings.data?.filter(({ application }) => application.status === "approved").map(({ application }) => <option key={application.id} value={application.id}>{application.semester}</option>)}
          </select>
          <Input type="number" min="1" step="1" placeholder="Amount (MWK)" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          <select className="input" aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)}>{["Airtel Money", "TNM Mpamba", "Bank"].map((item) => <option key={item}>{item}</option>)}</select>
          <Input placeholder="Payment reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={150} required />
          <Input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Proof of payment image" required onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 700 * 1024) { setError("Choose an image no larger than 700 KB."); return; } try { setProofPhoto(await readImage(file)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to read image."); } }} />
          {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
          <Button type="submit" disabled={saving || !proofPhoto}>{saving ? "Submitting…" : "Submit for verification"}</Button>
        </form>
      </Card>
      <h2 className="section-title">Payment submissions</h2>
      {payments.data?.map(({ payment, semester }) => <Card key={payment.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{payment.method} · {mkw(payment.amount)}</strong><Badge status={payment.status === "verified" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>{payment.status}</Badge></div><p className="muted">{semester} · Reference {payment.reference}</p></Card>)}
      <h2 className="section-title">Office receipts</h2>
      {receipts.loading && <p className="muted">Loading receipts…</p>}
      {receipts.error && <p role="alert" style={{ color: "var(--danger)" }}>{receipts.error}</p>}
      {!receipts.loading && !receipts.error && !receipts.data?.length && <Card><p className="muted">No receipts have been issued to your account.</p></Card>}
      {receipts.data?.map((receipt) => (
        <Card key={receipt.id} className="receipt-print">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{mkw(receipt.amount)}</div>
              <div className="muted">{receipt.method} · {new Date(receipt.paidAt).toLocaleDateString()}</div>
            </div>
            <Badge status={receipt.status === "verified" ? "success" : "warning"}>{receipt.status}</Badge>
          </div>
          <div style={{
            marginTop: 12, background: "var(--primary-light)", borderRadius: 8,
            padding: "8px 12px", fontFamily: "monospace", fontSize: ".85rem",
            display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap",
          }}>
            <span>{receipt.trackingNo}</span><a href={`/receipts/verify?number=${encodeURIComponent(receipt.trackingNo)}`} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: 700 }}>Verify</a>
          </div>
          <Button className="no-print" variant="ghost" style={{ marginTop: 10 }} onClick={() => window.print()}>Print / Save PDF</Button>
        </Card>
      ))}
    </div>
  );
}
