import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Phone, ShoppingBag, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const { profile } = await requireRole("admin");
  const supabase = await createClient();

  const { data: clientes } = await supabase
    .from("clientes")
    .select("*, direcciones(id), pedidos(id)")
    .eq("sucursal_id", profile.sucursal_id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes (CRM)</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Click en un cliente para ver perfil completo + direcciones + histórico.
          </p>
        </div>
        <Button asChild>
          <Link href="/pedidos/nuevo">
            <ShoppingBag className="h-4 w-4" /> Nuevo pedido
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Direcciones</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clientes ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--color-muted-foreground)]">
                    Sin clientes registrados.
                  </TableCell>
                </TableRow>
              )}
              {clientes?.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/clientes/${c.id}`} className="hover:underline">{c.nombre}</Link>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`tel:${c.telefono}`}
                      className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {c.telefono}
                    </a>
                  </TableCell>
                  <TableCell>{c.direcciones?.length ?? 0}</TableCell>
                  <TableCell>{c.pedidos?.length ?? 0}</TableCell>
                  <TableCell>
                    <Link href={`/clientes/${c.id}`}>
                      <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
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
