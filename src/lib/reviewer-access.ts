import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function assertReviewerAccess(supabase: SupabaseClient<Database>, userId: string) {
  const [reviewer, admin] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "reviewer" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (reviewer.error || admin.error || (!reviewer.data && !admin.data)) throw new Error("Forbidden");
}