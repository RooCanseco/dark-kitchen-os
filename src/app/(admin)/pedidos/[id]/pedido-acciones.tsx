"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { avanzarPedido, asignarRepartidor, cancelarPedido } from "../actions";
import { marcarEntregado } from "@/app/repartidor/actions";
import type { EstadoOperativo, MetodoPago } from "@/lib/supabase/types";

const ESTADO_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  nuevo: "default",
  preparando: "warning",
  listo: "secondary",
  en_ruta: "secondary",
  entregado: "success",
  cancelado: "destructive",
};

const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  preparando: "Preparando",
  listo: "Listo",
  en_ruta: "En ruta",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function EstadoBadge({ estado }: { estado: string }) {
  return <Badge variant={ESTADO_VARIANTS[estado] ?? "default"}>{ESTADO_LABEL[estado] ?? estado}</Badge>;
}

export function PedidoAcciones({
  pedido_id,
  estado,
  repartidor_id,
  repartidores,
  tipoEntrega,
}: {
  pedido_id: string;
  estado: EstadoOperativo;
  repartidor_id: string | null;
  repartidores: { user_id: string; nombre: string }[];
  tipoEntrega?: "entrega" | "pickup";
}) {
  const [pending, startTransition] = useTransition();

  function avanzar(nuevo: EstadoOperativo) {
    startTransition(async () => {
      try {
        await avanzarPedido(pedido_id, nuevo);
        toast.success("Estado actualizado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function asignar(value: string) {
    startTransition(async () => {
      try {
        await asignarRepartidor(pedido_id, value === "_none" ? null : value);
        toast.success(value === "_none" ? "Repartidor removido" : "Repartidor asignado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function cancelar() {
    if (!confirm("¿Cancelar el pedido?")) return;
    startTransition(async () => {
      try {
        await cancelarPedido(pedido_id);
        toast.success("Pedido cancelado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  if (estado === "entregado" || estado === "cancelado") {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Pedido finalizado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {estado === "nuevo" && (
            <Button onClick={() => avanzar("preparando")} disabled={pending}>
              Marcar en preparación
            </Button>
          )}
          {estado === "preparando" && (
            <Button onClick={() => avanzar("listo")} disabled={pending}>
              Marcar como listo
            </Button>
          )}
          <Button variant="destructive" onClick={cancelar} disabled={pending}>
            Cancelar pedido
          </Button>
        </div>

        {(estado === "listo" || estado === "en_ruta") && tipoEntrega !== "pickup" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Repartidor asignado</p>
            <Select defaultValue={repartidor_id ?? "_none"} onValueChange={asignar}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona repartidor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Sin asignar —</SelectItem>
                {repartidores.map((r) => (
                  <SelectItem key={r.user_id} value={r.user_id}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {repartidores.length === 0 && (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                No hay repartidores. Crea usuarios con rol &quot;repartidor&quot; en Configuración.
              </p>
            )}
          </div>
        )}

        {(estado === "listo") && tipoEntrega === "pickup" && (
          <div className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-2 text-xs">
            Pickup: marcar como entregado manualmente cuando el cliente recoja.
          </div>
        )}

        {tipoEntrega === "pickup" && estado === "listo" && (
          <PickupEntrega pedido_id={pedido_id} />
        )}
      </CardContent>
    </Card>
  );
}

function PickupEntrega({ pedido_id }: { pedido_id: string }) {
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [p, sp] = useTransition();
  function entregar() {
    if (!metodo) {
      toast.error("Selecciona método de pago primero");
      return;
    }
    sp(async () => {
      try {
        await marcarEntregado(pedido_id, metodo as MetodoPago);
        toast.success("Pickup entregado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }
  return (
    <div className="space-y-2 rounded-md border bg-[var(--color-muted)]/20 p-3">
      <p className="text-sm font-medium">Entrega pickup</p>
      <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago)}>
        <SelectTrigger><SelectValue placeholder="Método de pago" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="efectivo">Efectivo</SelectItem>
          <SelectItem value="transferencia">Transferencia</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="success" className="w-full" onClick={entregar} disabled={p || !metodo}>
        {p ? "Marcando..." : "Marcar entregado"}
      </Button>
    </div>
  );
}
