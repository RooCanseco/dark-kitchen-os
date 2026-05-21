import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { MenuClient } from "./menu-client";
import type { Menu, MenuComplemento } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type MenuWithComps = Menu & { menu_complementos: MenuComplemento[] };

export default async function MenuPage() {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("menus")
    .select("*, menu_complementos(*)")
    .eq("sucursal_id", profile.sucursal_id)
    .order("fecha", { ascending: false })
    .limit(30);
  return <MenuClient menus={(data ?? []) as MenuWithComps[]} />;
}
