import { Suspense } from "react";
import ReceiptVerifier from "@/components/hostel/ReceiptVerifier";

type PageProps = {
  searchParams: Promise<{ number?: string | string[] }>;
};

export default function VerifyReceiptPage({ searchParams }: PageProps) {
  return <Suspense fallback={<main className="page"><p className="muted">Loading receipt verifier…</p></main>}>
    <ReceiptVerifierFromUrl searchParams={searchParams} />
  </Suspense>;
}

async function ReceiptVerifierFromUrl({ searchParams }: PageProps) {
  const { number } = await searchParams;
  return <ReceiptVerifier initialNumber={Array.isArray(number) ? number[0] ?? "" : number ?? ""} />;
}