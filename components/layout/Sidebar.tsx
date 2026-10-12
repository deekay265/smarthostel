// components/layout/Sidebar.tsx — desktop only
"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Building2, CircleHelp } from "lucide-react";
import { navIcons, type NavItem } from "./navigation";
import SignOutButton from "./SignOutButton";

export default function Sidebar({ nav }: { nav: NavItem[] }) {
  const path = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"><Image src="/logo-white.png" alt="MUBAS crest" width={36} height={36} priority /></span>
        <div>
          <div className="brand-name">MUBAS Hostels</div>
          <div className="brand-caption">Residence portal</div>
        </div>
      </div>
      <div className="nav-caption">Workspace</div>
      <nav className="nav-list" aria-label="Main navigation">
        {nav.map((item) => {
          const active = path.startsWith(item.href);
          const Icon = navIcons[item.icon] ?? CircleHelp;
          return (
            <Link key={item.href} href={item.href} className={`nav-link${active ? " nav-link-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="nav-link-icon"><Icon size={18} strokeWidth={1.8} /></span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <Building2 size={17} />
        <span>Malawi University of<br />Business and Applied Sciences</span>
      </div>
      <SignOutButton className="sidebar-signout" />
    </aside>
  );
}