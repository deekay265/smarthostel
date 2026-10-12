import {
  ArrowLeftRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  ScanLine,
  House,
  KeyRound,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  UsersRound,
  VolumeX,
  Wrench,
} from "lucide-react";

export const navIcons = {
  dashboard: LayoutDashboard,
  credentials: KeyRound,
  students: UsersRound,
  inspections: ClipboardCheck,
  issues: Wrench,
  receipts: ReceiptText,
  lostFound: PackageSearch,
  home: House,
  checkin: ScanLine,
  transfer: ArrowLeftRight,
  noise: VolumeX,
  bookings: BedDouble,
  hostels: Building2,
  gate: ScanLine,
} as const;

export type NavIcon = keyof typeof navIcons;
export interface NavItem { href: string; label: string; icon: NavIcon; }
