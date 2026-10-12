"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useApiResource } from "@/components/hostel/useApiResource";
import { apiRequest } from "@/lib/api";

type Credential = { name: string; email: string; regNo: string; gender: string; password: string };
type StudentProfile = { id: string; name: string; regNo: string | null; gender: string | null };

export default function CredentialsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [regNo, setRegNo] = useState("");
  const [gender, setGender] = useState("male");
  const [credential, setCredential] = useState<Credential | null>(null);
  const students = useApiResource<StudentProfile[]>("/api/admin/credentials");
  const [eligibility, setEligibility] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function issue(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setCredential(null);
    try {
      setCredential(await apiRequest<Credential>("/api/admin/credentials", {
        method: "POST", body: JSON.stringify({ name, email, regNo, gender }),
      }));
      setName(""); setEmail(""); setRegNo(""); await students.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to issue credentials.");
    } finally { setSaving(false); }
  }

  async function saveEligibility(student: StudentProfile) {
    const gender = eligibility[student.id];
    if (!gender) return;
    try {
      await apiRequest("/api/admin/credentials", { method: "PATCH", body: JSON.stringify({ id: student.id, gender }) });
      await students.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update student eligibility."); }
  }

  return (
    <div className="grid">
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Issue student login</h2>
        <p className="muted" style={{ marginBottom: 10 }}>A temporary password is generated and displayed once. Share it securely with the student.</p>
        <form onSubmit={(event) => void issue(event)} style={{ display: "grid", gap: 10 }}>
          <Input placeholder="Student full name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
          <Input type="email" placeholder="University email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input placeholder="Registration number" value={regNo} onChange={(event) => setRegNo(event.target.value)} required maxLength={60} />
          <select className="input" aria-label="Verified hostel eligibility" value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="male">Male hostel eligibility</option><option value="female">Female hostel eligibility</option>
          </select>
          {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? "Issuing…" : "Generate and issue credentials"}</Button>
        </form>
      </Card>
      {credential && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{credential.name}</strong><Badge status="success">Account created</Badge></div>
          <p className="muted">{credential.regNo} · {credential.email}</p>
          <p className="muted">Verified eligibility: {credential.gender}</p>
          <p style={{ fontFamily: "monospace", marginTop: 8 }}>Temporary password: <strong>{credential.password}</strong></p>
        </Card>
      )}
      <Card>
        <h2 className="section-title" style={{ marginTop: 0 }}>Existing accounts without eligibility</h2>
        <p className="muted" style={{ marginBottom: 10 }}>Verify these records against student documentation before booking applications can be submitted.</p>
        {students.data?.filter((student) => !student.gender).map((student) => (
          <div key={student.id} className="activity-row" style={{ alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}><strong>{student.name}</strong><p className="muted">{student.regNo ?? "No registration number"}</p></div>
            <select className="input" aria-label={`Verified hostel eligibility for ${student.name}`} value={eligibility[student.id] ?? ""} onChange={(event) => setEligibility((values) => ({ ...values, [student.id]: event.target.value }))} style={{ maxWidth: 180 }}>
              <option value="">Select eligibility</option><option value="male">Male</option><option value="female">Female</option>
            </select>
            <Button disabled={!eligibility[student.id]} onClick={() => void saveEligibility(student)}>Save</Button>
          </div>
        ))}
        {!students.loading && !students.data?.some((student) => !student.gender) && <p className="muted">All student accounts have recorded eligibility.</p>}
      </Card>
    </div>
  );
}
