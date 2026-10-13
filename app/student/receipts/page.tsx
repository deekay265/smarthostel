"use client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { useApiResource } from "@/components/hostel/useApiResource";
import { mkw } from "@/lib/format";

type Receipt = { id: string; trackingNo: string; amount: number; method: string; paidAt: string; status: string };
type PaymentRow = { payment: { id: string; amount: number; method: string; reference: string; status: string }; semester: string };
type BookingWindow = {
  settings: { academicYear: string; monthlyRent: number } | null;
  student: { bankAccountNo: string | null };
  payment: { status: "paid" | "unpaid" | "amount-mismatch"; amount: number | null; reference?: string; paidAt?: string };
};

export default function ReceiptsPage() {
  const receipts = useApiResource<Receipt[]>("/api/hostel/receipts");
  const payments = useApiResource<PaymentRow[]>("/api/payments");
  const bookingWindow = useApiResource<BookingWindow>("/api/booking-window");
  return (
    <div className="grid">
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Hostel payment status</h2>
        {bookingWindow.error && <p role="alert" style={{ color: "var(--danger)" }}>{bookingWindow.error}</p>}
        {bookingWindow.loading && <p className="muted">Loading payment status…</p>}
        {!bookingWindow.loading && bookingWindow.data?.settings && <>
          <p><strong>Academic year:</strong> {bookingWindow.data.settings.academicYear}</p>
          <p style={{ marginTop: 6 }}><strong>Amount:</strong> {mkw(bookingWindow.data.payment.amount ?? bookingWindow.data.settings.monthlyRent)}</p>
          <p style={{ marginTop: 6 }}><strong>Status:</strong>{" "}
            <Badge status={bookingWindow.data.payment.status === "paid" ? "success" : bookingWindow.data.payment.status === "amount-mismatch" ? "danger" : "warning"}>{bookingWindow.data.payment.status}</Badge>
          </p>
          <p className="muted" style={{ marginTop: 6 }}>Student bank account: {bookingWindow.data.student.bankAccountNo ?? "Not assigned"}</p>
          {bookingWindow.data.payment.status === "paid" && <p className="muted" style={{ marginTop: 6 }}>Bank reference: {bookingWindow.data.payment.reference} · Recorded {new Date(bookingWindow.data.payment.paidAt!).toLocaleString()}</p>}
        </>}
        {!bookingWindow.loading && !bookingWindow.data?.settings && <p className="muted">The hostel office has not configured a booking year and rent yet.</p>}
      </Card>
      <h2 className="section-title">Previous payment records</h2>
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
