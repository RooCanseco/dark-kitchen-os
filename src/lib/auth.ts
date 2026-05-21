import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Rol, UserProfile } from "@/lib/supabase/types";

export interface LoadedProfile extends Omit<UserProfile, "sucursal_id" | "rol"> {
  sucursal_id: string;
  rol: Rol;
}

export async function getUserWithProfile(): Promise<{ userId: string; profile: LoadedProfile } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!profile || !profile.sucursal_id) return null;
  return {
    userId: user.id,
    profile: { ...profile, sucursal_id: profile.sucursal_id, rol: profile.rol as Rol },
  };
}

export async function requireRole(rol: Rol | Rol[]): Promise<{ userId: string; profile: LoadedProfile }> {
  const session = await getUserWithProfile();
  if (!session) redirect("/login");
  const allowed = Array.isArray(rol) ? rol : [rol];
  if (!allowed.includes(session.profile.rol)) {
    redirect("/login?error=acceso_denegado");
  }
  return session;
}
