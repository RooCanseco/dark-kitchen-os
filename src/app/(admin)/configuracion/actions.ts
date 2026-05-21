"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

// === TARIFAS ===
export async function upsertTarifa(input: {
  id?: string;
  nombre: string;
  km_min: number;
  km_max: number | null;
  costo: number;
  es_cotizacion: boolean;
}) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  if (input.id) {
    const { error } = await supabase
      .from("tarifas_envio")
      .update({
        nombre: input.nombre,
        km_min: input.km_min,
        km_max: input.km_max,
        costo: input.costo,
        es_cotizacion: input.es_cotizacion,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tarifas_envio").insert({
      sucursal_id: profile.sucursal_id,
      nombre: input.nombre,
      km_min: input.km_min,
      km_max: input.km_max,
      costo: input.costo,
      es_cotizacion: input.es_cotizacion,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/configuracion/tarifas");
}

export async function deleteTarifa(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("tarifas_envio").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracion/tarifas");
}

// === TAGS ===
export async function upsertTag(input: { id?: string; etiqueta: string; activo: boolean }) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  if (input.id) {
    const { error } = await supabase
      .from("menu_tags_excepcion")
      .update({ etiqueta: input.etiqueta, activo: input.activo })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("menu_tags_excepcion").insert({
      sucursal_id: profile.sucursal_id,
      etiqueta: input.etiqueta,
      activo: input.activo,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/configuracion/tags");
}

export async function deleteTag(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("menu_tags_excepcion").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracion/tags");
}
