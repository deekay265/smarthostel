"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { mkw } from "@/lib/format";

type Result = { valid: boolean; trackingNo: string; semester: string | null; amount: number; method: string; paidAt: string };

export default function ReceiptVerifier({ initialNumber }: { initialNumber: string }) {
  const [number, setNumber] = useState(initialNumber);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch(`/api/receipts/verify?number=${encodeURIComponent(number)}`);
      const data = await response.json() as Result | { error: string };
      if (!response.ok) throw new Error("error" in data ? data.error : "Receipt verification failed.");
      setResult(data as Result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Receipt verification failed."); }
    finally { setLoading(false); }
  }
  return <main className="page" style={{ maxWidth: 680 }}>
    <div className="page-intro"><div><div className="page-eyebrow">MUBAS residence services</div><h1 className="page-heading">Verify a receipt</h1><p className="page-description">Check whether a hostel payment tracking number was officially issued.</p></div></div>
    <Card style={{ marginTop: 22 }}>
      <form onSubmit={(event) => void verify(event)} style={{ display: "grid", gap: 10 }}>
        <Input aria-label="Receipt tracking number" placeholder="MUB-RCPT-…" value={number} onChange={(event) => setNumber(event.target.value)} required maxLength={80} />
        <Button type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify number"}</Button>
      </form>
      {error && <p role="alert" style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
      {result && <div role="status" style={{ marginTop: 16 }}><strong>Verified receipt</strong><p className="muted" style={{ marginTop: 8 }}>{result.semester ?? "Hostel payment"}</p><p>{mkw(result.amount)} · {result.method}</p><p className="muted">{result.trackingNo} · {new Date(result.paidAt).toLocaleDateString()}</p></div>}
    </Card>
  </main>;
}