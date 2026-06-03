import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // Client-only subtree. Supabase persists the session in localStorage, which
  // doesn't exist during SSR — gating server-side would cause a redirect loop
  // on hard refresh and fire protected server-fn calls with no bearer token
  // (→ "Unauthorized: No authorization header provided" blank screen).
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
