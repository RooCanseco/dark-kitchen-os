"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { PaqueteTipo, TipoEntrega } from "@/lib/supabase/types";

export async function searchClientes(query: string) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const q = query.trim();
  if (!q) return [];
  const { data } = await supabase
    .from("clientes")
    .select("*, direcciones(*)")
    .eq("sucursal_id", profile.sucursal_id)
    .or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%`)
    .limit(10);
  return data ?? [];
}

export async function getClienteConDirecciones(id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*, direcciones(*)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function crearCliente(input: {
  nombre: string;
  telefono: string;
  acepta_menu_diario?: boolean;
}) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      sucursal_id: profile.sucursal_id,
      nombre: input.nombre,
      telefono: input.telefono,
      acepta_menu_diario: input.acepta_menu_diario ?? true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/clientes");
  return data;
}

export async function crearDireccion(input: {
  cliente_id: string;
  alias: string;
  calle_y_numero: string;
  referencias?: string | null;
  lat?: number | null;
  lng?: number | null;
}) {
  await requireRole("admin");
  const supabase = await createClient();

  let distancia_km: number | null = null;
  let costo_envio_calculado = 0;

  if (input.lat != null && input.lng != null) {
    const calc = await calcularEnvio(input.lat, input.lng);
    distancia_km = calc.distancia_km;
    costo_envio_calculado = calc.costo;
  }

  const { data, error } = await supabase
    .from("direcciones")
    .insert({
      cliente_id: input.cliente_id,
      alias: input.alias,
      calle_y_numero: input.calle_y_numero,
      referencias: input.referencias ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      distancia_km,
      costo_envio_calculado,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function calcularEnvio(lat: number, lng: number): Promise<{ distancia_km: number; costo: number }> {
  // Esta función queda como placeholder server-side; el cálculo real con Distance Matrix
  // se hace desde el cliente (browser) y se pasa la distancia ya calculada.
  // Si no hay distancia, retorna 0 y deja que el admin asigne tarifa manual.
  return { distancia_km: 0, costo: 0 };
}

export async function calcularDistanciaServer(
  origen: { lat: number; lng: number },
  destino: { lat: number; lng: number },
): Promise<{ distancia_km: number; duracion_min: number }> {
  await requireRole("admin");
  // Distance Matrix se llama server-side. Si la key pública (NEXT_PUBLIC_GOOGLE_MAPS_KEY)
  // tiene restricción por HTTP referrer, Google la rechaza para llamadas servidor.
  // Por eso preferimos GOOGLE_MAPS_SERVER_KEY (sin restricción de referrer); cae a la
  // pública solo en local dev donde la key no tiene restricciones.
  const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key || key.startsWith("TODO")) {
    throw new Error("Google Maps key no configurada");
  }
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${origen.lat},${origen.lng}` +
    `&destinations=${destino.lat},${destino.lng}` +
    `&mode=driving&units=metric&language=es&key=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Distance Matrix HTTP ${res.status}`);
  const data = (await res.json()) as {
    status: string;
    error_message?: string;
    rows?: Array<{ elements: Array<{ status: string; distance?: { value: number }; duration?: { value: number } }> }>;
  };
  if (data.status !== "OK") {
    throw new Error(data.error_message ?? `Distance Matrix: ${data.status}`);
  }
  const el = data.rows?.[0]?.elements?.[0];
  if (!el || el.status !== "OK" || !el.distance || !el.duration) {
    throw new Error("No se pudo calcular distancia");
  }
  return {
    distancia_km: el.distance.value / 1000,
    duracion_min: Math.round(el.duration.value / 60),
  };
}

export async function tarifaParaDistancia(distancia_km: number) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tarifas_envio")
    .select("*")
    .eq("sucursal_id", profile.sucursal_id)
    .lte("km_min", distancia_km)
    .order("km_min", { ascending: false });
  if (error) throw new Error(error.message);

  // Buscar el rango que cubra la distancia
  const tarifa = (data ?? []).find(
    (t) => t.km_min <= distancia_km && (t.km_max == null || t.km_max >= distancia_km),
  );
  return tarifa ?? null;
}

export async function actualizarDireccionConDistancia(input: {
  direccion_id: string;
  distancia_km: number;
  duracion_min?: number | null;
  costo_envio_calculado: number;
}) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("direcciones")
    .update({
      distancia_km: input.distancia_km,
      duracion_min: input.duracion_min ?? null,
      costo_envio_calculado: input.costo_envio_calculado,
    })
    .eq("id", input.direccion_id);
  if (error) throw new Error(error.message);
}

export interface CrearPedidoInput {
  cliente_id: string;
  direccion_id: string | null;
  menu_id: string;
  tipo_entrega: TipoEntrega;
  observaciones_texto?: string | null;
  total_envio: number;
  items: Array<{
    paquete_tipo: PaqueteTipo;
    cantidad: number;
    piezas_por_paquete: number;
    precio_unitario: number;
    modificadores: Array<{ tag_excepcion_id: string; cantidad: number }>;
  }>;
}

export async function crearPedido(input: CrearPedidoInput) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  // Validar menú activo
  const { data: menu } = await supabase
    .from("menus")
    .select("id, activo")
    .eq("id", input.menu_id)
    .single();
  if (!menu || !menu.activo) {
    throw new Error("El menú seleccionado no está activo");
  }

  // Pickup no requiere dirección y no cobra envío
  const total_envio = input.tipo_entrega === "pickup" ? 0 : Number(input.total_envio);
  const total_platillos = input.items.reduce(
    (sum, i) => sum + i.cantidad * Number(i.precio_unitario),
    0,
  );
  const total_gran_total = total_platillos + total_envio;

  // 1. Crear pedido
  const { data: pedido, error: e1 } = await supabase
    .from("pedidos")
    .insert({
      sucursal_id: profile.sucursal_id,
      cliente_id: input.cliente_id,
      direccion_id: input.tipo_entrega === "pickup" ? null : input.direccion_id,
      menu_id: input.menu_id,
      tipo_entrega: input.tipo_entrega,
      observaciones_texto: input.observaciones_texto ?? null,
      total_platillos,
      total_envio,
      total_gran_total,
    })
    .select("id")
    .single();
  if (e1) throw new Error(e1.message);

  // 2. Crear items + modificadores
  for (const item of input.items) {
    const { data: itemRow, error: e2 } = await supabase
      .from("pedido_items")
      .insert({
        pedido_id: pedido.id,
        paquete_tipo: item.paquete_tipo,
        cantidad: item.cantidad,
        piezas_por_paquete: item.piezas_por_paquete,
        precio_unitario: item.precio_unitario,
      })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);

    if (item.modificadores.length > 0) {
      const { error: e3 } = await supabase.from("pedido_item_modificadores").insert(
        item.modificadores.map((m) => ({
          pedido_item_id: itemRow.id,
          tag_excepcion_id: m.tag_excepcion_id,
          cantidad: m.cantidad,
        })),
      );
      if (e3) throw new Error(e3.message);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/cocina");
  return { pedido_id: pedido.id };
}

// === Edición de pedido (añadir/quitar items) ===

export async function agregarItem(input: {
  pedido_id: string;
  paquete_tipo: PaqueteTipo;
  cantidad: number;
  piezas_por_paquete: number;
  precio_unitario: number;
  modificadores: Array<{ tag_excepcion_id: string; cantidad: number }>;
}) {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("pedido_items")
    .insert({
      pedido_id: input.pedido_id,
      paquete_tipo: input.paquete_tipo,
      cantidad: input.cantidad,
      piezas_por_paquete: input.piezas_por_paquete,
      precio_unitario: input.precio_unitario,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (input.modificadores.length > 0) {
    const { error: e2 } = await supabase.from("pedido_item_modificadores").insert(
      input.modificadores.map((m) => ({
        pedido_item_id: item.id,
        tag_excepcion_id: m.tag_excepcion_id,
        cantidad: m.cantidad,
      })),
    );
    if (e2) throw new Error(e2.message);
  }
  // Totales se recalculan por trigger DB
  revalidatePath(`/pedidos/${input.pedido_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
}

export async function eliminarItem(pedido_id: string, item_id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("pedido_items").delete().eq("id", item_id);
  if (error) throw new Error(error.message);
  revalidatePath(`/pedidos/${pedido_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
}

export async function actualizarCantidadItem(pedido_id: string, item_id: string, cantidad: number) {
  await requireRole("admin");
  if (cantidad < 1) throw new Error("La cantidad debe ser al menos 1");
  const supabase = await createClient();
  const { error } = await supabase.from("pedido_items").update({ cantidad }).eq("id", item_id);
  if (error) throw new Error(error.message);
  revalidatePath(`/pedidos/${pedido_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
}

export async function avanzarPedido(pedido_id: string, nuevo_estado: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ estado_operativo: nuevo_estado })
    .eq("id", pedido_id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/cocina");
  revalidatePath(`/pedidos/${pedido_id}`);
}

export async function asignarRepartidor(pedido_id: string, repartidor_id: string | null) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ repartidor_id, estado_operativo: repartidor_id ? "en_ruta" : "listo" })
    .eq("id", pedido_id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/pedidos/${pedido_id}`);
  revalidatePath("/repartidor");
}

export async function cancelarPedido(pedido_id: string) {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ estado_operativo: "cancelado" })
    .eq("id", pedido_id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/pedidos/${pedido_id}`);
}
