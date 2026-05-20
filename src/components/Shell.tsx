import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function useSessionUser() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return email;
}

function Header() {
  const email = useSessionUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  }

  return (
    <header className="hairline-b">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between gap-4">
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
          {email && <NavLink to="/sessions">My sessions</NavLink>}
          <NavLink to="/reviewer">Reviewer</NavLink>
          <div className="ml-3 pl-3 border-l border-ink/20 flex items-center gap-2">
            {email === undefined ? null : email ? (
              <>
                <span className="text-xs text-muted-foreground hidden md:inline">{email}</span>
                <button onClick={signOut} className="text-xs px-2.5 py-1 border border-ink rounded-sm hover:bg-secondary">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="text-xs px-2.5 py-1 bg-ink text-paper rounded-sm">
                Sign in
              </Link>
            )}
          </div>
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

// silence unused warning for useQuery if tree-shaken
export const __unused = useQuery;
