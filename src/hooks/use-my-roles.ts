import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles, type AppRole } from "@/lib/roles.functions";

export function useMyRoles() {
  const fetchRoles = useServerFn(getMyRoles);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthed(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const q = useQuery({
    queryKey: ["my-roles", authed],
    queryFn: () => fetchRoles(),
    enabled: authed,
    staleTime: 60_000,
  });

  const roles: AppRole[] = q.data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isReviewer: roles.includes("reviewer") || roles.includes("admin"),
    isLoading: q.isLoading,
  };
}
