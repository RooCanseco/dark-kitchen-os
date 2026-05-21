import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { formatMoney, todayISO } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function CierrePage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const params = await searchParams;
  const fecha = params.fecha ?? todayISO();
  const esHoy = fecha === todayISO();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("estado_operativo, estado_pago, metodo_pago, total_platillos, total_envio, total_gran_total, tipo_entrega")
    .eq("sucursal_id", profile.sucursal_id)
    .gte("created_at", fecha + "T00:00:00")
    .lt("created_at", fecha + "T23:59:59");

  const todos = pedidos ?? [];
  const entregados = todos.filter((p) => p.estado_operativo === "entregado");
  const enProceso = todos.filter((p) => !["entregado", "cancelado"].includes(p.estado_operativo));
  const cancelados = todos.filter((p) => p.estado_operativo === "cancelado");

  const sumPlatillos = entregados.reduce((s, p) => s + Number(p.total_platillos), 0);
  const sumEnvio = entregados.reduce((s, p) => s + Number(p.total_envio), 0);
  const sumTotal = entregados.reduce((s, p) => s + Number(p.total_gran_total), 0);

  // Pendientes por cobrar: cualquier pedido no cancelado con estado_pago=pendiente
  const pendientesCobrar = todos.filter(
    (p) => p.estado_pago === "pendiente" && p.estado_operativo !== "cancelado",
  );
  const sumPendientes = pendientesCobrar.reduce((s, p) => s + Number(p.total_gran_total), 0);

  const porMetodo = {
    efectivo: entregados
      .filter((p) => p.metodo_pago === "efectivo")
      .reduce((s, p) => s + Number(p.total_gran_total), 0),
    transferencia: entregados
      .filter((p) => p.metodo_pago === "transferencia")
      .reduce((s, p) => s + Number(p.total_gran_total), 0),
  };

  const porTipo = {
    entrega: entregados.filter((p) => p.tipo_entrega === "entrega").length,
    pickup: entregados.filter((p) => p.tipo_entrega === "pickup").length,
  };

  // Historial — últimos 14 días con al menos un pedido
  const desde14 = new Date();
  desde14.setDate(desde14.getDate() - 14);
  const { data: historial } = await supabase
    .from("pedidos")
    .select("created_at, total_gran_total, estado_operativo")
    .eq("sucursal_id", profile.sucursal_id)
    .gte("created_at", desde14.toISOString())
    .neq("estado_operativo", "cancelado");

  const porDia = new Map<string, { total: number; entregados: number; pendientes: number }>();
  for (const p of historial ?? []) {
    if (!p.created_at) continue;
    const d = p.created_at.slice(0, 10);
    const bucket = porDia.get(d) ?? { total: 0, entregados: 0, pendientes: 0 };
    if (p.estado_operativo === "entregado") {
      bucket.total += Number(p.total_gran_total);
      bucket.entregados += 1;
    } else {
      bucket.pendientes += 1;
    }
    porDia.set(d, bucket);
  }
  const dias = Array.from(porDia.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="space-y-6">
      {esHoy && <AutoRefresh intervalMs={10000} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Cierre de caja</h1>
            {esHoy && <Badge variant="success">En vivo</Badge>}
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
            {esHoy && " · actualiza cada 10s"}
          </p>
        </div>
        <form action="/cierre" method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="fecha"
            defaultValue={fecha}
            className="h-9 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
          />
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobrado</CardTitle>
            <CardDescription>Entregados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(sumTotal)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {entregados.length} pedido{entregados.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <CardHeader>
            <CardTitle className="text-base">Por cobrar</CardTitle>
            <CardDescription>En proceso, sin pagar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(sumPendientes)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {pendientesCobrar.length} pedido{pendientesCobrar.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose</CardTitle>
            <CardDescription>Entregados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Platillos" value={sumPlatillos} />
            <Row label="Envíos" value={sumEnvio} />
            <Separator className="my-2" />
            <Row label="Total" value={sumTotal} strong />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por método</CardTitle>
            <CardDescription>Entregados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Efectivo" value={porMetodo.efectivo} />
            <Row label="Transferencia" value={porMetodo.transferencia} />
            <Separator className="my-2" />
            <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
              <span>Entrega / Pickup</span>
              <span>{porTipo.entrega} / {porTipo.pickup}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos en proceso (por cobrar)</CardTitle>
          <CardDescription>
            Estado activo + pago pendiente. Suma: {formatMoney(sumPendientes)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enProceso.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Sin pedidos pendientes.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {enProceso.map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{p.estado_operativo}</Badge>
                    <Badge variant="outline">{p.tipo_entrega === "pickup" ? "Pickup" : "Entrega"}</Badge>
                  </div>
                  <span className="font-medium">{formatMoney(p.total_gran_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {cancelados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancelados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {cancelados.length} pedido{cancelados.length === 1 ? "" : "s"} cancelado{cancelados.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial — últimos 14 días</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Entregados</TableHead>
                <TableHead>Pendientes</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--color-muted-foreground)]">
                    Sin actividad en los últimos 14 días.
                  </TableCell>
                </TableRow>
              )}
              {dias.map(([fechaIso, info]) => (
                <TableRow key={fechaIso}>
                  <TableCell>
                    {new Date(fechaIso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell>{info.entregados}</TableCell>
                  <TableCell>{info.pendientes}</TableCell>
                  <TableCell className="text-right">{formatMoney(info.total)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/cierre?fecha=${fechaIso}`}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      Ver
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={"flex justify-between" + (strong ? " text-base font-bold" : "")}>
      <span className={strong ? "" : "text-[var(--color-muted-foreground)]"}>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}
