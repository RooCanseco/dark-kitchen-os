import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { UsuariosClient } from "./usuarios-client";
import type { UserProfile } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const { userId } = await requireRole("admin");
  const supabase = await createClient();

  const { data: perfiles } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Cargar emails desde auth admin (no están en user_profiles)
  const emails: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of data.users ?? []) {
      if (u.email) emails[u.id] = u.email;
    }
  } catch {
    // service_role no configurado — seguimos sin emails
  }

  return (
    <UsuariosClient
      usuarios={(perfiles ?? []) as UserProfile[]}
      emails={emails}
      currentUserId={userId}
    />
  );
}
