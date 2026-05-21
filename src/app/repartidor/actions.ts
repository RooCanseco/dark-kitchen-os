"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { MetodoPago } from "@/lib/supabase/types";

export async function reordenarRuta(pedido_id: string, direction: "up" | "down") {
  await requireRole(["admin", "repartidor"]);
  const supabase = await createClient();

  const { data: editar, error: e0 } = await supabase
    .from("pedidos")
    .select("repartidor_id")
    .eq("id", pedido_id)
    .single();
  if (e0 || !editar?.repartidor_id) throw new Error("Pedido sin repartidor asignado");

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, orden_ruta, created_at")
    .eq("repartidor_id", editar.repartidor_id)
    .eq("estado_operativo", "en_ruta");
  if (!pedidos || pedidos.length === 0) return;

  // Orden: orden_ruta asc nulls last, después created_at asc
  const sorted = [...pedidos].sort((a, b) => {
    if (a.orden_ruta == null && b.orden_ruta == null) {
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    }
    if (a.orden_ruta == null) return 1;
    if (b.orden_ruta == null) return -1;
    return a.orden_ruta - b.orden_ruta;
  });

  const idx = sorted.findIndex((p) => p.id === pedido_id);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || targetIdx < 0 || targetIdx >= sorted.length) return;

  [sorted[idx], sorted[targetIdx]] = [sorted[targetIdx], sorted[idx]];

  for (let i = 0; i < sorted.length; i++) {
    const { error } = await supabase
      .from("pedidos")
      .update({ orden_ruta: i + 1 })
      .eq("id", sorted[i].id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/repartidor");
}

export async function actualizarMetodoPago(pedido_id: string, metodo: MetodoPago) {
  await requireRole(["admin", "repartidor"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ metodo_pago: metodo })
    .eq("id", pedido_id);
  if (error) throw new Error(error.message);
  revalidatePath("/repartidor");
  revalidatePath(`/repartidor/${pedido_id}`);
}

export async function marcarEntregado(pedido_id: string, metodo: MetodoPago) {
  await requireRole(["admin", "repartidor"]);
  const supabase = await createClient();
  // Set metodo + estado simultaneously; trigger se encarga de estado_pago + entregado_at
  const { error } = await supabase
    .from("pedidos")
    .update({ metodo_pago: metodo, estado_operativo: "entregado" })
    .eq("id", pedido_id);
  if (error) throw new Error(error.message);
  revalidatePath("/repartidor");
  revalidatePath(`/repartidor/${pedido_id}`);
  revalidatePath("/dashboard");
}
