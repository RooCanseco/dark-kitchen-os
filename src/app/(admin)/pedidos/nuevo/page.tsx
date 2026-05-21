import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { NuevoPedidoForm } from "./nuevo-pedido-form";
import { todayISO } from "@/lib/utils";
import type { Menu, TagExcepcion, Sucursal } from "@/lib/supabase/types";

export default async function NuevoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();
  const { cliente: preselectedClienteId } = await searchParams;

  const [{ data: menus }, { data: tags }, { data: sucursal }] = await Promise.all([
    supabase
      .from("menus")
      .select("*")
      .eq("sucursal_id", profile.sucursal_id)
      .eq("fecha", todayISO())
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("menu_tags_excepcion")
      .select("*")
      .eq("sucursal_id", profile.sucursal_id)
      .eq("activo", true)
      .order("etiqueta"),
    supabase
      .from("sucursales")
      .select("*")
      .eq("id", profile.sucursal_id)
      .single(),
  ]);

  if (!menus || menus.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <Card className="border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
            <div>
              <CardTitle>No hay menús activos para hoy</CardTitle>
              <CardDescription className="mt-1">
                Activa al menos un menú diario antes de capturar pedidos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/menu">Ir a Menú diario</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Nuevo pedido</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {menus.length === 1 ? `Menú: ${menus[0].nombre}` : `${menus.length} menús activos hoy`}
        </p>
      </div>
      <NuevoPedidoForm
        menus={menus as Menu[]}
        tags={(tags ?? []) as TagExcepcion[]}
        sucursal={sucursal as Sucursal}
        preselectedClienteId={preselectedClienteId}
      />
    </div>
  );
}
