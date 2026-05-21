import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, MapPin, ExternalLink } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { EntregaActions } from "./entrega-actions";
import { PAQUETE_LABEL } from "@/lib/paquetes";
import type { EstadoOperativo, MetodoPago } from "@/lib/supabase/types";

export default async function RepartidorPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireRole(["admin", "repartidor"]);
  const supabase = await createClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select(`*,
      clientes(nombre, telefono),
      direcciones(alias, calle_y_numero, referencias, lat, lng),
      pedido_items(*,
        pedido_item_modificadores(cantidad, menu_tags_excepcion(etiqueta))
      )
    `)
    .eq("id", id)
    .single();

  if (!pedido) notFound();
  // Si no es admin, validar que sea su pedido
  if (profile.rol !== "admin" && pedido.repartidor_id !== userId) notFound();

  const mapsHref = pedido.direcciones?.lat && pedido.direcciones?.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${pedido.direcciones.lat},${pedido.direcciones.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.direcciones?.calle_y_numero ?? "")}`;

  return (
    <div className="space-y-4">
      <Link href="/repartidor" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <div>
        <h1 className="text-xl font-bold">{pedido.clientes?.nombre}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={pedido.estado_operativo === "entregado" ? "success" : "secondary"}>
            {pedido.estado_operativo}
          </Badge>
          {pedido.metodo_pago && <Badge variant="outline">{pedido.metodo_pago}</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <a
            href={`tel:${pedido.clientes?.telefono}`}
            className="flex h-12 items-center justify-center gap-2 rounded-md border-2 border-[var(--color-primary)] text-base font-semibold text-[var(--color-primary)]"
          >
            <Phone className="h-5 w-5" /> Llamar al cliente
          </a>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] text-base font-semibold text-[var(--color-primary-foreground)]"
          >
            <ExternalLink className="h-5 w-5" /> Abrir en Maps
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1 text-base">
            <MapPin className="h-4 w-4" /> Dirección
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-semibold">{pedido.direcciones?.alias}</p>
          <p className="text-sm">{pedido.direcciones?.calle_y_numero}</p>
          {pedido.direcciones?.referencias && (
            <p className="text-xs text-[var(--color-muted-foreground)]">Ref: {pedido.direcciones?.referencias}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pedido.pedido_items?.map((item) => (
            <div key={item.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {PAQUETE_LABEL[item.paquete_tipo as keyof typeof PAQUETE_LABEL]} × {item.cantidad}
                </span>
                <span>{formatMoney(item.cantidad * Number(item.precio_unitario))}</span>
              </div>
              {item.pedido_item_modificadores && item.pedido_item_modificadores.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.pedido_item_modificadores.map((mod, idx) => (
                    <span key={idx} className="text-xs text-[var(--color-muted-foreground)]">
                      [{mod.menu_tags_excepcion?.etiqueta}] × {mod.cantidad}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex justify-between border-t pt-2">
            <span>Envío</span>
            <span>{formatMoney(pedido.total_envio)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{formatMoney(pedido.total_gran_total)}</span>
          </div>
        </CardContent>
      </Card>

      {pedido.observaciones_texto && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">
              <span className="font-medium">Observaciones:</span> {pedido.observaciones_texto}
            </p>
          </CardContent>
        </Card>
      )}

      <EntregaActions
        pedido_id={pedido.id}
        estado={pedido.estado_operativo as EstadoOperativo}
        metodo_actual={pedido.metodo_pago as MetodoPago | null}
      />
    </div>
  );
}
