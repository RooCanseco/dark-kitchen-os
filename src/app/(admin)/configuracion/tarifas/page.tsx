import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { TarifasClient } from "./tarifas-client";
import type { TarifaEnvio } from "@/lib/supabase/types";

export default async function TarifasPage() {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("tarifas_envio")
    .select("*")
    .eq("sucursal_id", profile.sucursal_id)
    .order("km_min");
  return <TarifasClient tarifas={(data ?? []) as TarifaEnvio[]} />;
}
