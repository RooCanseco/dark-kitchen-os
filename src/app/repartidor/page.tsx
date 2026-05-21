import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";
import { ReordenarBtn } from "./reordenar-btn";

export const dynamic = "force-dynamic";

export default async function RepartidorPage() {
  const { userId } = await requireRole(["admin", "repartidor"]);
  const supabase = await createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, clientes(nombre, telefono), direcciones(alias, calle_y_numero, lat, lng)")
    .eq("repartidor_id", userId)
    .eq("tipo_entrega", "entrega")
    .in("estado_operativo", ["en_ruta", "entregado"])
    .order("created_at", { ascending: false })
    .limit(50);

  const enRuta = (pedidos ?? [])
    .filter((p) => p.estado_operativo === "en_ruta")
    .sort((a, b) => {
      if (a.orden_ruta == null && b.orden_ruta == null) {
        return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      }
      if (a.orden_ruta == null) return 1;
      if (b.orden_ruta == null) return -1;
      return a.orden_ruta - b.orden_ruta;
    });
  const entregados = (pedidos ?? []).filter((p) => p.estado_operativo === "entregado");

  return (
    <div className="space-y-4">
      <AutoRefresh intervalMs={30000} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis pedidos</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/repartidor">
            <RefreshCcw className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {enRuta.length === 0 && entregados.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            Sin pedidos asignados.
          </CardContent>
        </Card>
      )}

      {enRuta.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--color-muted-foreground)]">
            EN RUTA ({enRuta.length}) — ordena tu ruta con las flechas
          </h2>
          {enRuta.map((p, idx) => (
            <PedidoCard
              key={p.id}
              pedido={p}
              ordenLabel={String(idx + 1)}
              canMoveUp={idx > 0}
              canMoveDown={idx < enRuta.length - 1}
            />
          ))}
        </section>
      )}

      {entregados.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--color-muted-foreground)]">ENTREGADOS</h2>
          {entregados.map((p) => (
            <PedidoCard key={p.id} pedido={p} delivered />
          ))}
        </section>
      )}
    </div>
  );
}

function PedidoCard({
  pedido,
  ordenLabel,
  canMoveUp = false,
  canMoveDown = false,
  delivered = false,
}: {
  pedido: {
    id: string;
    total_gran_total: number;
    metodo_pago: string | null;
    clientes: { nombre: string; telefono: string } | null;
    direcciones: { alias: string; calle_y_numero: string } | null;
  };
  ordenLabel?: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  delivered?: boolean;
}) {
  return (
    <Card className={delivered ? "opacity-60" : ""}>
      <CardContent className="flex items-stretch gap-2 p-3">
        {ordenLabel && (
          <div className="flex flex-col items-center justify-center gap-1">
            <ReordenarBtn pedido_id={pedido.id} direction="up" disabled={!canMoveUp} />
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-[var(--color-primary-foreground)]">
              {ordenLabel}
            </div>
            <ReordenarBtn pedido_id={pedido.id} direction="down" disabled={!canMoveDown} />
          </div>
        )}
        <Link href={`/repartidor/${pedido.id}`} className="flex flex-1 items-center gap-3">
          {delivered && <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{pedido.clientes?.nombre}</p>
            <p className="flex items-center gap-1 truncate text-sm text-[var(--color-muted-foreground)]">
              <MapPin className="h-3 w-3 shrink-0" />
              {pedido.direcciones?.alias} · {pedido.direcciones?.calle_y_numero}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">{formatMoney(pedido.total_gran_total)}</Badge>
              {pedido.metodo_pago && <Badge variant="success">{pedido.metodo_pago}</Badge>}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" />
        </Link>
      </CardContent>
    </Card>
  );
}
