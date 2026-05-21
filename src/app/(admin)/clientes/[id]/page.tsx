import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { ClienteDetalle } from "./cliente-detalle";
import { HistorialPedidos } from "./historial-pedidos";
import type { Cliente, Direccion, Sucursal } from "@/lib/supabase/types";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  const [{ data: cliente }, { data: direcciones }, { data: sucursal }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase.from("direcciones").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
    supabase.from("sucursales").select("*").eq("id", profile.sucursal_id).single(),
    supabase
      .from("pedidos")
      .select("id, created_at, estado_operativo, estado_pago, metodo_pago, total_gran_total, tipo_entrega, menus(nombre)")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </Link>
        <Button asChild>
          <Link href={`/pedidos/nuevo?cliente=${id}`}>
            <ShoppingBag className="h-4 w-4" /> Nuevo pedido
          </Link>
        </Button>
      </div>

      <ClienteDetalle
        cliente={cliente as Cliente}
        direcciones={(direcciones ?? []) as Direccion[]}
        sucursal={sucursal as Sucursal}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pedidos ({pedidos?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <HistorialPedidos pedidos={(pedidos ?? []) as unknown as Parameters<typeof HistorialPedidos>[0]["pedidos"]} />
        </CardContent>
      </Card>
    </div>
  );
}
