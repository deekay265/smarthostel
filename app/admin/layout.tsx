// app/admin/layout.tsx
"use client";
import { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import type { NavItem } from "@/components/layout/navigation";

const nav: NavItem[] = [
  { href: "/admin/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/admin/hostels", label: "Hostels", icon: "hostels" },
  { href: "/admin/bookings", label: "Bookings", icon: "bookings" },
  { href: "/admin/gate", label: "Gate scan", icon: "gate" },
  { href: "/admin/credentials", label: "Credentials", icon: "credentials" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/inspections", label: "Inspections", icon: "inspections" },
  { href: "/admin/issues", label: "Issues", icon: "issues" },
  { href: "/admin/receipts", label: "Receipts", icon: "receipts" },
  { href: "/admin/lost-found", label: "Lost & Found", icon: "lostFound" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Admin Portal" nav={nav}>{children}</AppShell>;
}