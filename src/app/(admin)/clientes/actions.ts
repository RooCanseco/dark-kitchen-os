"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function upsertCliente(input: {
  id?: string;
  nombre: string;
  telefono: string;
  acepta_menu_diario?: boolean;
}) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("clientes")
      .update({
        nombre: input.nombre,
        telefono: input.telefono,
        acepta_menu_diario: input.acepta_menu_diario ?? true,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("clientes").insert({
      sucursal_id: profile.sucursal_id,
      nombre: input.nombre,
      telefono: input.telefono,
      acepta_menu_diario: input.acepta_menu_diario ?? true,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/clientes");
  if (input.id) revalidatePath(`/clientes/${input.id}`);
}

export async function upsertDireccion(input: {
  id?: string;
  cliente_id: string;
  alias: string;
  calle_y_numero: string;
  referencias: string | null;
  lat: number | null;
  lng: number | null;
  distancia_km: number | null;
  duracion_min: number | null;
  costo_envio_calculado: number;
  url_ubicacion: string | null;
}) {
  await requireRole("admin");
  const supabase = await createClient();
  if (input.id) {
    const { error } = await supabase
      .from("direcciones")
      .update({
        alias: input.alias,
        calle_y_numero: input.calle_y_numero,
        referencias: input.referencias,
        lat: input.lat,
        lng: input.lng,
        distancia_km: input.distancia_km,
        duracion_min: input.duracion_min,
        costo_envio_calculado: input.costo_envio_calculado,
        url_ubicacion: input.url_ubicacion,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("direcciones").insert({
      cliente_id: input.cliente_id,
      alias: input.alias,
      calle_y_numero: input.calle_y_numero,
      referencias: input.referencias,
      lat: input.lat,
      lng: input.lng,
      distancia_km: input.distancia_km,
      duracion_min: input.duracion_min,
      costo_envio_calculado: input.costo_envio_calculado,
      url_ubicacion: input.url_ubicacion,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/clientes/${input.cliente_id}`);
}

export async function deleteDireccion(direccion_id: string, cliente_id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  // Verificar que no tenga pedidos vinculados
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("direccion_id", direccion_id);
  if (count && count > 0) {
    throw new Error(`No se puede eliminar: hay ${count} pedido(s) con esta dirección`);
  }
  const { error } = await supabase.from("direcciones").delete().eq("id", direccion_id);
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${cliente_id}`);
}
