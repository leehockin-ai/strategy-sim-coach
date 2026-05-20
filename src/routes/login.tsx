import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/scenarios",
  }),
  head: () => ({
    meta: [{ title: "Sign in · Strategyzer Coach Certification" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/scenarios`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirectTo });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + redirectTo,
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: redirectTo });
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <Shell>
      <section className="mx-auto max-w-md px-6 py-16">
        <span className="chip mb-4 inline-flex">{mode === "signup" ? "Create account" : "Sign in"}</span>
        <h1 className="text-3xl tracking-tight mb-2">
          {mode === "signup" ? "Start your certification" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {mode === "signup"
            ? "Your scenario progress is saved to your account."
            : "Pick up where you left off. Your sessions are saved automatically."}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full border border-ink px-4 py-2.5 text-sm rounded-sm hover:bg-secondary disabled:opacity-50 mb-4"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-ink/20" /> or <div className="flex-1 h-px bg-ink/20" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:bg-secondary"
              />
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:bg-secondary"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.12em] mb-1 block">Password</label>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink bg-paper px-3 py-2 text-sm focus:outline-none focus:bg-secondary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper px-4 py-2.5 text-sm rounded-sm disabled:opacity-50"
          >
            {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="underline text-ink"
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>

        <p className="mt-8 text-center">
          <Link to="/" className="text-xs text-muted-foreground underline">← Back to home</Link>
        </p>
      </section>
    </Shell>
  );
}
