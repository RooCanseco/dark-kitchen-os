import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { TagsClient } from "./tags-client";
import type { TagExcepcion } from "@/lib/supabase/types";

export default async function TagsPage() {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("menu_tags_excepcion")
    .select("*")
    .eq("sucursal_id", profile.sucursal_id)
    .order("etiqueta");
  return <TagsClient tags={(data ?? []) as TagExcepcion[]} />;
}
