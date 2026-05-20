import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="hairline-b">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <Logo />
          <div className="flex flex-col leading-none">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Strategyzer</span>
            <span className="text-sm font-medium">Coach Certification Simulator</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/scenarios">Scenarios</NavLink>
          <NavLink to="/reviewer">Reviewer</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-sm hover:bg-secondary transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded-sm bg-ink text-paper" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="hairline mt-24">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>Strategyzer Coach Certification — MVP Simulator</span>
        <span className="marker-num">L1 / 2026</span>
      </div>
    </footer>
  );
}

export function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0" aria-hidden>
      <rect x="1" y="1" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6" y="6" width="10" height="10" fill="var(--brand-blue)" />
      <rect x="20" y="6" width="10" height="10" fill="var(--brand-lime)" />
      <rect x="6" y="20" width="10" height="10" fill="var(--brand-red)" />
      <rect x="20" y="20" width="10" height="10" fill="var(--brand-cyan)" />
    </svg>
  );
}
