import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, MapPin, Store, Truck, Clock, MessageCircle, Bike } from "lucide-react";
import { formatMoney, whatsAppLink } from "@/lib/utils";
import { PedidoAcciones, EstadoBadge } from "./pedido-acciones";
import { EditarItems } from "./editar-items";
import { notFound } from "next/navigation";
import type { EstadoOperativo, Menu, TagExcepcion } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select(`
      *,
      clientes(id, nombre, telefono),
      direcciones(alias, calle_y_numero, referencias, url_ubicacion, distancia_km, duracion_min),
      menus(id, nombre, fecha, precio_individual, precio_doble, precio_familiar, piezas_individual, piezas_doble, piezas_familiar, activo, sucursal_id, descripcion, imagen_url, created_at),
      pedido_items(*,
        pedido_item_modificadores(*, menu_tags_excepcion(etiqueta))
      )
    `)
    .eq("id", id)
    .single();

  if (!pedido) notFound();

  const [{ data: repartidores }, { data: tags }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_id, nombre")
      .eq("rol", "repartidor")
      .eq("activo", true),
    supabase
      .from("menu_tags_excepcion")
      .select("*")
      .eq("sucursal_id", profile.sucursal_id)
      .eq("activo", true)
      .order("etiqueta"),
  ]);

  // Buscar nombre del repartidor asignado (si lo hay)
  let repartidorNombre: string | null = null;
  if (pedido.repartidor_id) {
    const found = (repartidores ?? []).find((r) => r.user_id === pedido.repartidor_id);
    if (found) {
      repartidorNombre = found.nombre;
    } else {
      // Caso: el repartidor está inactivo pero tiene perfil
      const { data: rep } = await supabase
        .from("user_profiles")
        .select("nombre")
        .eq("user_id", pedido.repartidor_id)
        .single();
      repartidorNombre = rep?.nombre ?? null;
    }
  }

  const isPickup = pedido.tipo_entrega === "pickup";
  const finalizado = pedido.estado_operativo === "entregado" || pedido.estado_operativo === "cancelado";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al dashboard
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pedido #{pedido.id.slice(0, 8)}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Creado: {pedido.created_at ? new Date(pedido.created_at).toLocaleString("es-MX") : "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {isPickup ? <><Store className="mr-1 h-3 w-3" /> Pickup</> : <><Truck className="mr-1 h-3 w-3" /> Entrega</>}
          </Badge>
          <EstadoBadge estado={pedido.estado_operativo} />
          <Badge variant={pedido.estado_pago === "pagado" ? "success" : "secondary"}>
            {pedido.estado_pago === "pagado" ? "Pagado" : "Pendiente"}
          </Badge>
          {pedido.metodo_pago && <Badge variant="outline">{pedido.metodo_pago}</Badge>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/clientes/${pedido.clientes?.id}`} className="block">
              <p className="font-semibold hover:underline">{pedido.clientes?.nombre}</p>
            </Link>
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${pedido.clientes?.telefono}`}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-[var(--color-accent)]"
              >
                <Phone className="h-3 w-3" /> {pedido.clientes?.telefono}
              </a>
              {pedido.clientes?.telefono && (
                <a
                  href={whatsAppLink(pedido.clientes.telefono)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[#25D366]/30 bg-[#25D366]/10 px-2 py-1 text-xs text-[#1B9C4D] hover:bg-[#25D366]/20"
                >
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              )}
            </div>
            {repartidorNombre && (
              <div className="mt-3 flex items-center gap-2 rounded-md border bg-[var(--color-muted)]/30 p-2 text-sm">
                <Bike className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                <span>Repartidor:</span>
                <span className="font-medium">{repartidorNombre}</span>
              </div>
            )}
            {isPickup ? (
              <div className="mt-3 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-2 text-xs">
                <p className="flex items-center gap-1 font-medium">
                  <Store className="h-3 w-3" /> Pickup en sucursal
                </p>
                <p className="text-[var(--color-muted-foreground)]">El cliente pasa por su pedido. No requiere repartidor.</p>
              </div>
            ) : pedido.direcciones && (
              <div className="mt-3 text-sm">
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="h-3 w-3" /> {pedido.direcciones.alias}
                </div>
                <p className="text-[var(--color-muted-foreground)]">{pedido.direcciones.calle_y_numero}</p>
                {pedido.direcciones.referencias && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">Ref: {pedido.direcciones.referencias}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {pedido.direcciones.distancia_km != null && (
                    <Badge variant="outline">{Number(pedido.direcciones.distancia_km).toFixed(2)} km</Badge>
                  )}
                  {pedido.direcciones.duracion_min != null && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" /> {pedido.direcciones.duracion_min} min
                    </Badge>
                  )}
                  {pedido.direcciones.url_ubicacion && (
                    <a
                      href={pedido.direcciones.url_ubicacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      Ver mapa
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Menú</span>
              <span>{pedido.menus?.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Platillos</span>
              <span>{formatMoney(pedido.total_platillos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Envío</span>
              <span>{formatMoney(pedido.total_envio)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(pedido.total_gran_total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <EditarItems
        pedido_id={pedido.id}
        items={pedido.pedido_items ?? []}
        menu={pedido.menus as unknown as Menu | null}
        tags={(tags ?? []) as TagExcepcion[]}
        editable={!finalizado}
      />

      {pedido.observaciones_texto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{pedido.observaciones_texto}</p>
          </CardContent>
        </Card>
      )}

      <PedidoAcciones
        pedido_id={pedido.id}
        estado={pedido.estado_operativo as EstadoOperativo}
        repartidor_id={pedido.repartidor_id}
        repartidores={(repartidores ?? []) as { user_id: string; nombre: string }[]}
        tipoEntrega={pedido.tipo_entrega as "entrega" | "pickup"}
      />
    </div>
  );
}
