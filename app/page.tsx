import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react";

export default function Home() {
  return (
    <main className="home-hero">
      <div className="home-content">
        <div className="home-topline">
          <span className="brand-mark"><Image src="/logo-white.png" alt="MUBAS crest" width={38} height={38} priority /></span>
          <span>MUBAS · RESIDENCE SERVICES</span>
        </div>
        <div className="home-layout">
          <section>
            <div className="home-eyebrow">Welcome to your campus home</div>
            <h1 className="home-title">MUBAS <span>Student Hostels</span></h1>
            <p className="home-description">
              Your residence information and hostel services, thoughtfully brought together in one secure portal.
            </p>
            <div className="home-features">
              <div className="home-feature"><Check size={16} /> Simple residence services</div>
              <div className="home-feature"><Check size={16} /> Secure student access</div>
              <div className="home-feature"><Check size={16} /> Direct hostel support</div>
              <div className="home-feature"><Check size={16} /> Stay in the know</div>
            </div>
          </section>
          <aside className="home-login-card">
            <span className="home-card-icon"><ShieldCheck size={23} /></span>
            <div className="home-card-title">Your residence portal</div>
            <p className="home-card-copy">Sign in to access your accommodation, requests, and essential student services.</p>
            <div className="home-card-benefit"><UsersRound size={16} /> For students and hostel administrators</div>
            <div className="home-card-benefit"><ClipboardCheck size={16} /> Manage residence tasks in one place</div>
            <Link href="/login" className="home-card-link">
              <span>Continue to sign in</span><ArrowRight size={17} />
            </Link>
          </aside>
        </div>
        <div className="home-footer">Malawi University of Business and Applied Sciences</div>
      </div>
    </main>
  );
}
