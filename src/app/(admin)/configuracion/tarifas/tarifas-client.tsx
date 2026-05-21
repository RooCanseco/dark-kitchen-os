"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { upsertTarifa, deleteTarifa } from "../actions";
import type { TarifaEnvio } from "@/lib/supabase/types";

export function TarifasClient({ tarifas }: { tarifas: TarifaEnvio[] }) {
  const [editing, setEditing] = useState<TarifaEnvio | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este rango de tarifa?")) return;
    startTransition(async () => {
      try {
        await deleteTarifa(id);
        toast.success("Rango eliminado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarifas de envío</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Rangos de kilometraje. El costo se asigna automáticamente al capturar un pedido.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo rango
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rango (km)</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarifas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--color-muted-foreground)]">
                    Sin rangos configurados.
                  </TableCell>
                </TableRow>
              )}
              {tarifas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nombre ?? "—"}</TableCell>
                  <TableCell>
                    {Number(t.km_min)} – {t.km_max != null ? `${Number(t.km_max)} km` : "∞"}
                  </TableCell>
                  <TableCell>{t.es_cotizacion ? "Cotización" : formatMoney(t.costo)}</TableCell>
                  <TableCell>
                    {t.es_cotizacion ? (
                      <Badge variant="warning">Manual</Badge>
                    ) : (
                      <Badge variant="secondary">Automática</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} disabled={pending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TarifaDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function TarifaDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TarifaEnvio | null;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const es_cotizacion = fd.get("es_cotizacion") === "on";
    const kmMaxRaw = fd.get("km_max") as string;
    startTransition(async () => {
      try {
        await upsertTarifa({
          id: editing?.id,
          nombre: fd.get("nombre") as string,
          km_min: Number(fd.get("km_min")),
          km_max: kmMaxRaw ? Number(kmMaxRaw) : null,
          costo: es_cotizacion ? 0 : Number(fd.get("costo")),
          es_cotizacion,
        });
        toast.success(editing ? "Rango actualizado" : "Rango creado");
        onOpenChange(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar rango" : "Nuevo rango"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={editing?.nombre ?? ""} required placeholder="Rango A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="km_min">Km mín</Label>
              <Input id="km_min" name="km_min" type="number" step="0.1" min="0" defaultValue={editing?.km_min ?? 0} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_max">Km máx (vacío = ∞)</Label>
              <Input id="km_max" name="km_max" type="number" step="0.1" min="0" defaultValue={editing?.km_max ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="costo">Costo (MXN)</Label>
            <Input id="costo" name="costo" type="number" step="0.01" min="0" defaultValue={editing?.costo ?? 0} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="es_cotizacion"
              defaultChecked={editing?.es_cotizacion ?? false}
              className="h-4 w-4"
            />
            Cotización manual (sin costo automático)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
