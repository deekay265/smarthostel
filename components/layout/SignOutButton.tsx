"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth";

export default function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch (error) {
      console.error("Sign-out request failed:", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return <button type="button" className={className} onClick={() => void signOut()} disabled={busy} aria-label="Sign out" title="Sign out">
    <LogOut size={18} strokeWidth={1.9} />
    <span>{busy ? "Signing out…" : "Sign out"}</span>
  </button>;
}