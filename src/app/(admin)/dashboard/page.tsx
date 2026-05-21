import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Plus, AlertTriangle, ChefHat, Bike, Package, CheckCircle2, ShoppingBag,
  RefreshCcw, ArrowRight,
} from "lucide-react";
import { formatMoney, todayISO } from "@/lib/utils";
import { EstadoBadge } from "../pedidos/[id]/pedido-acciones";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const hoy = todayISO();

  const [{ data: menus }, { data: pedidosHoy }, { data: repartidoresList }] = await Promise.all([
    supabase
      .from("menus")
      .select("*")
      .eq("sucursal_id", profile.sucursal_id)
      .eq("fecha", hoy)
      .eq("activo", true),
    supabase
      .from("pedidos")
      .select("*, clientes(nombre, telefono), direcciones(alias, calle_y_numero)")
      .eq("sucursal_id", profile.sucursal_id)
      .gte("created_at", hoy + "T00:00:00")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_profiles")
      .select("user_id, nombre")
      .eq("rol", "repartidor"),
  ]);

  const repartidorById = new Map((repartidoresList ?? []).map((r) => [r.user_id, r.nombre]));
  const menu = menus?.[0] ?? null;
  const menuCount = menus?.length ?? 0;

  const pedidos = pedidosHoy ?? [];
  const stats = {
    nuevo: pedidos.filter((p) => p.estado_operativo === "nuevo").length,
    preparando: pedidos.filter((p) => p.estado_operativo === "preparando").length,
    listo: pedidos.filter((p) => p.estado_operativo === "listo").length,
    en_ruta: pedidos.filter((p) => p.estado_operativo === "en_ruta").length,
    entregado: pedidos.filter((p) => p.estado_operativo === "entregado").length,
  };

  const ingresoEntregado = pedidos
    .filter((p) => p.estado_operativo === "entregado")
    .reduce((sum, p) => sum + Number(p.total_gran_total), 0);

  const ingresosPorMetodo = {
    efectivo: pedidos
      .filter((p) => p.estado_operativo === "entregado" && p.metodo_pago === "efectivo")
      .reduce((sum, p) => sum + Number(p.total_gran_total), 0),
    transferencia: pedidos
      .filter((p) => p.estado_operativo === "entregado" && p.metodo_pago === "transferencia")
      .reduce((sum, p) => sum + Number(p.total_gran_total), 0),
    tarjeta: pedidos
      .filter((p) => p.estado_operativo === "entregado" && p.metodo_pago === "tarjeta")
      .reduce((sum, p) => sum + Number(p.total_gran_total), 0),
  };

  const sinRepartidor = pedidos.filter(
    (p) => p.estado_operativo === "listo" && !p.repartidor_id,
  );

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={15000} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operación del día</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {menuCount > 0 && (
              <>
                {" · Menú: "}
                <span className="font-medium text-[var(--color-foreground)]">
                  {menuCount === 1 ? menu!.nombre : `${menuCount} activos`}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <RefreshCcw className="h-4 w-4" /> Actualizar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/pedidos/nuevo">
              <Plus className="h-4 w-4" /> Nuevo pedido
            </Link>
          </Button>
        </div>
      </div>

      {menuCount === 0 && (
        <Card className="border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
            <div>
              <CardTitle>No hay menú activo para hoy</CardTitle>
              <CardDescription className="mt-1">
                Activa un menú para empezar a capturar pedidos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/menu">Configurar menú</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {sinRepartidor.length > 0 && (
        <Card className="border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
            <div>
              <CardTitle>{sinRepartidor.length} pedido{sinRepartidor.length === 1 ? "" : "s"} listo{sinRepartidor.length === 1 ? "" : "s"} sin repartidor</CardTitle>
              <CardDescription className="mt-1">
                Asigna repartidor para mover a &quot;En ruta&quot;.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={ShoppingBag} label="Nuevos" value={stats.nuevo} accent="bg-blue-500/10 text-blue-600" />
        <StatCard icon={ChefHat} label="Preparando" value={stats.preparando} accent="bg-amber-500/10 text-amber-600" />
        <StatCard icon={Package} label="Listos" value={stats.listo} accent="bg-purple-500/10 text-purple-600" />
        <StatCard icon={Bike} label="En ruta" value={stats.en_ruta} accent="bg-sky-500/10 text-sky-600" />
        <StatCard icon={CheckCircle2} label="Entregados" value={stats.entregado} accent="bg-green-500/10 text-green-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos del día (entregados)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(ingresoEntregado)}</p>
            <div className="mt-3 space-y-1 text-sm">
              <Row label="Efectivo" value={ingresosPorMetodo.efectivo} />
              <Row label="Transferencia" value={ingresosPorMetodo.transferencia} />
              <Row label="Tarjeta" value={ingresosPorMetodo.tarjeta} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <Link href="/cocina">Pantalla cocina <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cierre">Cierre de caja <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/clientes">CRM clientes <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/menu">Menú diario <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos de hoy</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Dirección / Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Repartidor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-[var(--color-muted-foreground)]">
                    Sin pedidos hoy.
                  </TableCell>
                </TableRow>
              )}
              {pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{p.clientes?.nombre}</TableCell>
                  <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                    {p.tipo_entrega === "pickup" ? (
                      <Badge variant="outline">Pickup en sucursal</Badge>
                    ) : (
                      <>{p.direcciones?.alias} · {p.direcciones?.calle_y_numero}</>
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado_operativo} />
                    {p.estado_operativo === "listo" && !p.repartidor_id && p.tipo_entrega === "entrega" && (
                      <Badge variant="warning" className="ml-1">Sin repartidor</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.tipo_entrega === "pickup" ? (
                      <span className="text-[var(--color-muted-foreground)]">— (pickup)</span>
                    ) : p.repartidor_id ? (
                      repartidorById.get(p.repartidor_id) ?? "—"
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(p.total_gran_total)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/pedidos/${p.id}`}>Ver</Link>
                    </Button>
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

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}
