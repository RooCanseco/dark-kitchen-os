"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/utils";

export interface ComplementoInput {
  id?: string;
  nombre: string;
  unidad: string | null;
  cantidad_individual: number;
  cantidad_doble: number;
  cantidad_familiar: number;
  orden: number;
}

export async function upsertMenu(input: {
  id?: string;
  fecha: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  activo: boolean;
  precio_individual: number;
  precio_doble: number;
  precio_familiar: number;
  piezas_individual: number;
  piezas_doble: number;
  piezas_familiar: number;
  complementos: ComplementoInput[];
}) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  const payload = {
    fecha: input.fecha,
    nombre: input.nombre,
    descripcion: input.descripcion,
    imagen_url: input.imagen_url,
    activo: input.activo,
    precio_individual: input.precio_individual,
    precio_doble: input.precio_doble,
    precio_familiar: input.precio_familiar,
    piezas_individual: input.piezas_individual,
    piezas_doble: input.piezas_doble,
    piezas_familiar: input.piezas_familiar,
  };

  let menuId = input.id;
  if (menuId) {
    const { error } = await supabase.from("menus").update(payload).eq("id", menuId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("menus")
      .insert({ sucursal_id: profile.sucursal_id, ...payload })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    menuId = data.id;
  }

  // Reemplazar complementos: borrar los que ya no están y upsert los actuales
  const ids = input.complementos.filter((c) => c.id).map((c) => c.id!);
  if (ids.length === 0) {
    await supabase.from("menu_complementos").delete().eq("menu_id", menuId);
  } else {
    await supabase.from("menu_complementos").delete().eq("menu_id", menuId).not("id", "in", `(${ids.join(",")})`);
  }
  for (const c of input.complementos) {
    const compPayload = {
      menu_id: menuId,
      nombre: c.nombre,
      unidad: c.unidad,
      cantidad_individual: c.cantidad_individual,
      cantidad_doble: c.cantidad_doble,
      cantidad_familiar: c.cantidad_familiar,
      orden: c.orden,
    };
    if (c.id) {
      const { error } = await supabase.from("menu_complementos").update(compPayload).eq("id", c.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("menu_complementos").insert(compPayload);
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/menu");
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
}

export async function toggleMenuActivo(id: string, activo: boolean) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("menus").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/menu");
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
}

export async function deleteMenu(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("menus").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/menu");
}

/**
 * Mueve un menú activo de fecha pasada a hoy. Útil al inicio del día.
 * Copia el menú + sus complementos a fecha=hoy y desactiva el original.
 */
export async function rollMenuToToday(id: string) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const hoy = todayISO();

  const { data: original, error: e1 } = await supabase
    .from("menus")
    .select("*, menu_complementos(*)")
    .eq("id", id)
    .single();
  if (e1 || !original) throw new Error(e1?.message ?? "Menú no encontrado");

  if (original.fecha === hoy) {
    return { menu_id: original.id };
  }

  // Crear copia para hoy
  const { data: nuevo, error: e2 } = await supabase
    .from("menus")
    .insert({
      sucursal_id: profile.sucursal_id,
      fecha: hoy,
      nombre: original.nombre,
      descripcion: original.descripcion,
      imagen_url: original.imagen_url,
      activo: true,
      precio_individual: original.precio_individual,
      precio_doble: original.precio_doble,
      precio_familiar: original.precio_familiar,
      piezas_individual: original.piezas_individual,
      piezas_doble: original.piezas_doble,
      piezas_familiar: original.piezas_familiar,
    })
    .select("id")
    .single();
  if (e2) throw new Error(e2.message);

  // Copiar complementos
  if (original.menu_complementos && original.menu_complementos.length > 0) {
    const compInserts = original.menu_complementos.map((c) => ({
      menu_id: nuevo.id,
      nombre: c.nombre,
      unidad: c.unidad,
      cantidad_individual: c.cantidad_individual,
      cantidad_doble: c.cantidad_doble,
      cantidad_familiar: c.cantidad_familiar,
      orden: c.orden,
    }));
    await supabase.from("menu_complementos").insert(compInserts);
  }

  // Desactivar el original (queda como histórico)
  await supabase.from("menus").update({ activo: false }).eq("id", id);

  revalidatePath("/menu");
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
  return { menu_id: nuevo.id };
}
