import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RefreshCcw, UtensilsCrossed, Salad } from "lucide-react";
import { todayISO } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const { profile } = await requireRole(["admin", "cocina"]);
  const supabase = await createClient();
  const hoy = todayISO();

  const { data: menus } = await supabase
    .from("menus")
    .select("*")
    .eq("sucursal_id", profile.sucursal_id)
    .eq("fecha", hoy)
    .eq("activo", true)
    .order("nombre");

  const [{ data: produccion }, { data: complementos }] = await Promise.all([
    supabase
      .from("vista_cocina_produccion")
      .select("*")
      .eq("sucursal_id", profile.sucursal_id)
      .eq("fecha", hoy),
    supabase
      .from("vista_cocina_complementos")
      .select("*")
      .eq("sucursal_id", profile.sucursal_id)
      .eq("fecha", hoy)
      .order("orden"),
  ]);

  if (!menus || menus.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sin menú activo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-[var(--color-muted-foreground)]">Espera a que el admin active el menú del día.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalGeneral = menus.reduce((sum, m) => {
    const piezas = produccion?.find((r) => r.menu_id === m.id)?.total_piezas ?? 0;
    return sum + Number(piezas);
  }, 0);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={20000} />
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="secondary" className="mb-2 text-base">Producción del día</Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            {menus.length === 1 ? menus[0].nombre : `${menus.length} menús activos`}
          </h1>
        </div>
        <Button size="xl" asChild className="text-lg">
          <Link href="/cocina">
            <RefreshCcw className="h-6 w-6" /> Actualizar
          </Link>
        </Button>
      </div>

      {menus.length > 1 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Total general piezas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-6xl font-bold leading-none tracking-tight">{totalGeneral}</p>
            <p className="mt-2 text-xl text-[var(--color-muted-foreground)]">piezas en {menus.length} menús</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {menus.map((m) => {
          const rows = (produccion ?? []).filter((r) => r.menu_id === m.id);
          const totalPiezas = Number(rows[0]?.total_piezas ?? 0);
          const excepciones = rows
            .filter((r) => r.excepcion)
            .map((r) => ({ etiqueta: r.excepcion!, total: Number(r.total_con_excepcion) }));
          const totalConExcepcion = excepciones.reduce((s, e) => s + e.total, 0);
          const totalEstandar = Math.max(0, totalPiezas - totalConExcepcion);

          const compsMenu = (complementos ?? []).filter((c) => c.menu_id === m.id);
          const totalIndiv = rows[0]?.total_piezas != null ? 0 : 0; // not needed

          // Count packages by tipo for this menu (for displaying e.g. 5 envases)
          // Total paquetes lo guardamos como m.total_paquetes via vista. Actually vista_cocina_complementos
          // already sums total_paquetes per complemento — that's piezas not envases. Better: count per item

          return (
            <Card key={m.id} className="border-2">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{m.nombre}</CardTitle>
                  <Badge variant="outline" className="text-base">
                    Indiv:{m.piezas_individual} · Doble:{m.piezas_doble} · Fam:{m.piezas_familiar}
                  </Badge>
                </div>
                {m.descripcion && (
                  <p className="text-base text-[var(--color-muted-foreground)]">{m.descripcion}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    Proteína / piezas a cocinar
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border-2 bg-[var(--color-background)] p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Total piezas</p>
                      <p className="text-5xl font-bold leading-none">{totalPiezas}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-muted)]/30 p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Estándar</p>
                      <p className="text-5xl font-bold leading-none">{totalEstandar}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-warning)]/10 p-4">
                      <p className="text-sm text-[var(--color-muted-foreground)]">Con excepción</p>
                      <p className="text-5xl font-bold leading-none">{totalConExcepcion}</p>
                    </div>
                  </div>
                </div>

                {compsMenu.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="mb-2 flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      <Salad className="h-4 w-4" /> Complementos a preparar
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {compsMenu.map((c) => {
                        const cant = Number(c.total_cantidad ?? 0);
                        return (
                          <div
                            key={c.complemento_id ?? c.complemento}
                            className="flex items-center justify-between rounded-md border bg-[var(--color-background)] p-3"
                          >
                            <span className="font-medium">{c.complemento}</span>
                            <span className="text-2xl font-bold tabular-nums">
                              {cant % 1 === 0 ? cant.toFixed(0) : cant.toFixed(2)}
                              {c.unidad && <span className="ml-1 text-base font-normal text-[var(--color-muted-foreground)]">{c.unidad}</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {excepciones.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Excepciones (tags)
                    </p>
                    {excepciones.map((e) => (
                      <div
                        key={e.etiqueta}
                        className="flex items-center justify-between rounded-md border-2 p-3"
                      >
                        <Badge variant="warning" className="text-base font-semibold">
                          [{e.etiqueta}]
                        </Badge>
                        <p className="text-2xl font-bold">{e.total}</p>
                      </div>
                    ))}
                  </div>
                )}

                {totalPiezas === 0 && (
                  <p className="rounded-md bg-[var(--color-muted)]/30 p-4 text-center text-sm text-[var(--color-muted-foreground)]">
                    <UtensilsCrossed className="mx-auto mb-2 h-6 w-6" />
                    Sin pedidos activos para este menú aún.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
