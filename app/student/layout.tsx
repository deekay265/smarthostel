// app/student/layout.tsx
"use client";
import { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/navigation";

const nav: NavItem[] = [
  { href: "/student/dashboard", label: "Home", icon: "home" },
  { href: "/student/bookings", label: "Bookings", icon: "bookings" },
  { href: "/student/checkin", label: "Check-in", icon: "checkin" },
  { href: "/student/inspections", label: "Inspections", icon: "inspections" },
  { href: "/student/receipts", label: "Receipts", icon: "receipts" },
  { href: "/student/maintenance", label: "Repairs", icon: "issues" },
  { href: "/student/transfer", label: "Transfer", icon: "transfer" },
  { href: "/student/complaints", label: "Noise", icon: "noise" },
  { href: "/student/lostfound", label: "Lost & Found", icon: "lostFound" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Student Portal" nav={nav}>{children}</AppShell>;
}