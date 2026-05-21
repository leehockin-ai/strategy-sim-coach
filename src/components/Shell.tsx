import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-my-roles";

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
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hidden sm:inline">Simulator</span>
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
    <svg width="140" height="22" viewBox="0 0 211 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden>
      <g clipPath="url(#sz-clip)">
        <path d="M56.8098 20.1313C56.8098 24.1418 53.0186 27.441 46.765 27.441C39.847 27.441 36.2902 22.7193 35.958 17.6618H39.3584C39.5929 21.4945 42.6024 24.6554 46.6282 24.6554C50.5171 24.6554 53.2335 22.9169 53.2335 20.0918C53.2335 17.6223 51.6702 16.1999 48.2698 15.3701L44.713 14.5206C39.2021 13.2167 36.6029 10.846 36.6029 7.15166C36.6029 2.78559 40.8436 0 45.8074 0C52.3346 0 55.6373 3.71412 56.0867 8.2975H52.6864C52.3737 5.13655 50.009 2.76583 45.9637 2.76583C42.5243 2.76583 40.1596 4.26729 40.1596 6.97385C40.1596 8.98896 41.3908 10.0953 45.7292 11.1424L49.286 11.9919C54.1716 13.1772 56.8098 15.4887 56.8098 20.1313Z" fill="currentColor" />
        <path d="M57.2402 10.2744V7.72589H60.7188V3.32031H63.8847V7.72589H68.7312V10.2744H63.8847V22.3651C63.8847 23.8665 64.4123 24.4987 66.0343 24.4987H68.5944V27.0472H65.1549C61.95 27.0472 60.7188 25.5063 60.7188 22.7207V10.2744H57.2402Z" fill="currentColor" />
        <path d="M87.9217 9.8964C85.0099 9.8964 83.5638 11.5559 83.4465 13.8278H80.2806C80.5152 10.2718 83.0752 7.32812 87.9217 7.32812C92.1625 7.32812 95.641 9.46177 95.641 15.2898V27.0248H92.5924V23.2317H92.5142C91.5176 25.8987 89.2702 27.4002 86.2802 27.4002C82.6062 27.4002 79.6357 25.1678 79.6357 21.4141C79.6357 17.4432 83.0752 16.159 87.1205 15.7442L92.4751 15.1712V14.5588C92.4751 11.6744 90.9117 9.8964 87.9217 9.8964ZM92.4751 18.6483V17.6012L87.3941 18.1741C84.5214 18.4902 83.0752 19.5175 83.0752 21.5722C83.0752 23.5083 84.795 24.8517 87.0423 24.8517C90.4036 24.8714 92.4751 22.8365 92.4751 18.6483Z" fill="currentColor" />
        <path d="M96.7939 10.2744V7.72589H100.273V3.32031H103.438V7.72589H108.285V10.2744H103.438V22.3651C103.438 23.8665 103.966 24.4987 105.588 24.4987H108.148V27.0472H104.709C101.504 27.0472 100.273 25.5063 100.273 22.7207V10.2744H96.7939Z" fill="currentColor" />
        <path d="M117.587 27.4197C111.9 27.4197 108.715 22.7375 108.715 17.3837C108.715 12.0298 111.724 7.34766 117.431 7.34766C123.118 7.34766 126.557 11.8718 126.029 18.3517H111.92C112.076 22.3622 114.363 24.8712 117.88 24.8712C121.202 24.8712 122.199 22.5202 122.61 20.9398H125.775C125.111 24.3773 122.825 27.4197 117.587 27.4197ZM111.92 15.8032H122.883C122.61 12.3262 120.773 9.89617 117.411 9.89617C114.05 9.89617 112.232 12.3262 111.92 15.8032Z" fill="currentColor" />
        <path d="M142.562 22.1648H142.484C141.409 24.9504 139.123 26.6494 136.094 26.6494C130.661 26.6494 127.886 22.3229 127.886 16.9888C127.886 11.6547 130.68 7.32812 136.094 7.32812C139.103 7.32812 141.409 9.02714 142.484 11.8127H142.562V7.72324H145.728V26.3729C145.728 30.7389 142.855 33.9789 137.325 33.9789C132.283 33.9789 129.566 31.5094 129.039 27.5582H132.205C132.635 30.3043 134.804 31.4304 137.325 31.4304C140.315 31.4304 142.562 29.8104 142.562 26.3729V22.1648ZM137.071 24.1009C140.745 24.1009 142.718 21.2758 142.718 16.9888C142.718 12.7017 140.725 9.87664 137.071 9.87664C133.397 9.87664 131.345 12.7017 131.345 16.9888C131.345 21.2758 133.397 24.1009 137.071 24.1009Z" fill="currentColor" />
        <path d="M147.115 7.72656H150.398L156.593 24.8747L162.671 7.72656H165.954L156.789 33.6069H153.506L156.515 25.1118H153.388L147.115 7.72656Z" fill="currentColor" />
        <path d="M177.152 10.2712H167.029V7.72266H181.061V10.2712L170.664 24.4955H181.393V27.044H166.756V24.4955L177.152 10.2712Z" fill="currentColor" />
        <path d="M190.559 27.4197C184.872 27.4197 181.687 22.7375 181.687 17.3837C181.687 12.0298 184.696 7.34766 190.402 7.34766C196.089 7.34766 199.529 11.8718 199.001 18.3517H184.891C185.048 22.3622 187.334 24.8712 190.852 24.8712C194.174 24.8712 195.171 22.5202 195.581 20.9398H198.747C198.102 24.3773 195.796 27.4197 190.559 27.4197ZM184.911 15.8032H195.874C195.601 12.3262 193.764 9.89617 190.402 9.89617C187.041 9.89617 185.224 12.3262 184.911 15.8032Z" fill="currentColor" />
        <path d="M80.3786 7.72656H70.6465V27.0479H73.7342V10.2948H80.3786V7.72656Z" fill="currentColor" />
        <path d="M211 7.72656H201.268V27.0479H204.355V10.2948H211V7.72656Z" fill="currentColor" />
        <path d="M21.5749 13.7106C21.5749 18.1755 17.9791 21.8106 13.5625 21.8106C9.14587 21.8106 5.55006 18.1755 5.55006 13.7106C5.55006 9.24579 9.14587 5.61069 13.5625 5.61069V0C6.07771 0 0 6.16386 0 13.7106C0 21.2772 6.07771 27.4213 13.5625 27.4213C21.0472 27.4213 27.1249 21.2772 27.1249 13.7106H21.5749ZM13.5625 13.7304H21.5749C21.5749 9.26554 17.9791 5.63045 13.5625 5.63045V13.7304Z" fill="currentColor" />
      </g>
      <defs>
        <clipPath id="sz-clip">
          <rect width="211" height="34" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
}

