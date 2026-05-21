import Link from "next/link";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { EstadoBadge } from "@/app/(admin)/pedidos/[id]/pedido-acciones";

export function HistorialPedidos({
  pedidos,
}: {
  pedidos: Array<{
    id: string;
    created_at: string | null;
    estado_operativo: string;
    estado_pago: string;
    metodo_pago: string | null;
    total_gran_total: number;
    tipo_entrega: string;
    menus: { nombre: string } | null;
  }>;
}) {
  if (pedidos.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        Sin pedidos registrados.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Menú</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Pago</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {pedidos.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-xs">
              {p.created_at ? new Date(p.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—"}
            </TableCell>
            <TableCell>{p.menus?.nombre ?? "—"}</TableCell>
            <TableCell>
              <Badge variant="outline">{p.tipo_entrega === "pickup" ? "Pickup" : "Entrega"}</Badge>
            </TableCell>
            <TableCell><EstadoBadge estado={p.estado_operativo} /></TableCell>
            <TableCell>
              {p.estado_pago === "pagado" ? (
                <Badge variant="success">{p.metodo_pago ?? "Pagado"}</Badge>
              ) : (
                <Badge variant="secondary">Pendiente</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">{formatMoney(p.total_gran_total)}</TableCell>
            <TableCell>
              <Link href={`/pedidos/${p.id}`} className="text-sm text-[var(--color-primary)] hover:underline">
                Ver
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
