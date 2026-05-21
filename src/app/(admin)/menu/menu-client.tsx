"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, PowerOff, Power, CalendarClock, ArrowRight } from "lucide-react";
import { formatMoney, formatDate, todayISO } from "@/lib/utils";
import { upsertMenu, toggleMenuActivo, deleteMenu, rollMenuToToday, type ComplementoInput } from "./actions";
import type { Menu, MenuComplemento } from "@/lib/supabase/types";

type MenuWithComps = Menu & { menu_complementos: MenuComplemento[] };

export function MenuClient({ menus }: { menus: MenuWithComps[] }) {
  const [editing, setEditing] = useState<MenuWithComps | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = todayISO();
  const activosHoy = menus.filter((m) => m.activo && m.fecha === today);
  const activosPasados = menus.filter((m) => m.activo && m.fecha < today);

  function onToggle(m: MenuWithComps) {
    startTransition(async () => {
      try {
        await toggleMenuActivo(m.id, !m.activo);
        toast.success(m.activo ? "Menú desactivado" : "Menú activado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este menú?")) return;
    startTransition(async () => {
      try {
        await deleteMenu(id);
        toast.success("Menú eliminado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function onRollToToday(id: string) {
    startTransition(async () => {
      try {
        await rollMenuToToday(id);
        toast.success("Menú activado para hoy");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menú diario</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Puedes tener varios menús activos por día. Operador elige al capturar pedido.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo menú
        </Button>
      </div>

      {activosPasados.length > 0 && (
        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Menús activos de días anteriores ({activosPasados.length})
            </CardTitle>
            <CardDescription>
              Estos menús siguen marcados como activos pero su fecha es pasada. Reactiva uno para hoy con un click.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activosPasados.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border bg-[var(--color-background)] p-3">
                <div>
                  <p className="font-semibold">{m.nombre}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Fecha: {formatDate(m.fecha + "T12:00:00")}
                  </p>
                </div>
                <Button size="sm" onClick={() => onRollToToday(m.id)} disabled={pending}>
                  <ArrowRight className="h-4 w-4" /> Activar hoy
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activosHoy.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {activosHoy.map((m) => (
            <Card key={m.id} className="border-[var(--color-success)]/30 bg-[var(--color-success)]/5">
              <CardHeader>
                <Badge variant="success" className="w-fit">Activo hoy</Badge>
                <CardTitle className="mt-2">{m.nombre}</CardTitle>
                {m.descripcion && <CardDescription>{m.descripcion}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">Individual {formatMoney(m.precio_individual)} · {m.piezas_individual} pza</Badge>
                  <Badge variant="outline">Doble {formatMoney(m.precio_doble)} · {m.piezas_doble} pzas</Badge>
                  <Badge variant="outline">Familiar {formatMoney(m.precio_familiar)} · {m.piezas_familiar} pzas</Badge>
                </div>
                {m.menu_complementos && m.menu_complementos.length > 0 && (
                  <div className="border-t pt-2 text-xs text-[var(--color-muted-foreground)]">
                    <p className="font-medium">Complementos:</p>
                    <ul className="ml-3 list-disc">
                      {m.menu_complementos.map((c) => (
                        <li key={c.id}>
                          {c.nombre}: {Number(c.cantidad_individual)} / {Number(c.cantidad_doble)} / {Number(c.cantidad_familiar)} {c.unidad ?? ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activosPasados.length === 0 && (
        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <CardHeader>
            <CardTitle>No hay menú activo para hoy</CardTitle>
            <CardDescription>Crea uno nuevo o reactiva uno existente.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {menus.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Sin menús creados.</p>
          )}
          {menus.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.nombre}</span>
                  {m.activo && m.fecha === today && <Badge variant="success">Activo hoy</Badge>}
                  {m.activo && m.fecha < today && <Badge variant="warning">Activo (fecha pasada)</Badge>}
                  {m.menu_complementos && m.menu_complementos.length > 0 && (
                    <Badge variant="outline">{m.menu_complementos.length} complemento{m.menu_complementos.length === 1 ? "" : "s"}</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDate(m.fecha + "T12:00:00")} · {formatMoney(m.precio_individual)}/{m.piezas_individual} · {formatMoney(m.precio_doble)}/{m.piezas_doble} · {formatMoney(m.precio_familiar)}/{m.piezas_familiar}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onToggle(m)} disabled={pending} title={m.activo ? "Desactivar" : "Activar"}>
                {m.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(m.id)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <MenuDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function MenuDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: MenuWithComps | null;
}) {
  const [pending, startTransition] = useTransition();
  const [complementos, setComplementos] = useState<ComplementoInput[]>(
    editing?.menu_complementos?.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      unidad: c.unidad,
      cantidad_individual: Number(c.cantidad_individual),
      cantidad_doble: Number(c.cantidad_doble),
      cantidad_familiar: Number(c.cantidad_familiar),
      orden: c.orden,
    })) ?? [],
  );

  function addComp() {
    setComplementos((prev) => [
      ...prev,
      { nombre: "", unidad: "", cantidad_individual: 0, cantidad_doble: 0, cantidad_familiar: 0, orden: prev.length },
    ]);
  }

  function updateComp(idx: number, patch: Partial<ComplementoInput>) {
    setComplementos((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removeComp(idx: number) {
    setComplementos((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const compsLimpios = complementos
      .filter((c) => c.nombre.trim())
      .map((c, i) => ({ ...c, orden: i }));
    startTransition(async () => {
      try {
        await upsertMenu({
          id: editing?.id,
          fecha: fd.get("fecha") as string,
          nombre: fd.get("nombre") as string,
          descripcion: (fd.get("descripcion") as string) || null,
          imagen_url: (fd.get("imagen_url") as string) || null,
          activo: fd.get("activo") === "on",
          precio_individual: Number(fd.get("precio_individual")),
          precio_doble: Number(fd.get("precio_doble")),
          precio_familiar: Number(fd.get("precio_familiar")),
          piezas_individual: Number(fd.get("piezas_individual")),
          piezas_doble: Number(fd.get("piezas_doble")),
          piezas_familiar: Number(fd.get("piezas_familiar")),
          complementos: compsLimpios,
        });
        toast.success(editing ? "Menú actualizado" : "Menú creado");
        onOpenChange(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar menú" : "Nuevo menú"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={editing?.fecha ?? todayISO()} required />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="activo" defaultChecked={editing?.activo ?? true} className="h-4 w-4" />
                Activar menú
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Guisado / platillo</Label>
            <Input id="nombre" name="nombre" defaultValue={editing?.nombre ?? ""} required placeholder="Tortitas de pollo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea id="descripcion" name="descripcion" defaultValue={editing?.descripcion ?? ""} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imagen_url">URL de imagen (opcional)</Label>
            <Input id="imagen_url" name="imagen_url" type="url" defaultValue={editing?.imagen_url ?? ""} placeholder="https://..." />
          </div>

          <div className="space-y-3 rounded-md border bg-[var(--color-muted)]/20 p-3">
            <p className="text-sm font-medium">Proteína · Precio · Piezas por orden</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="precio_individual" className="text-xs">Individual $</Label>
                <Input id="precio_individual" name="precio_individual" type="number" step="0.01" min="0" defaultValue={editing?.precio_individual ?? 70} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_doble" className="text-xs">Doble $</Label>
                <Input id="precio_doble" name="precio_doble" type="number" step="0.01" min="0" defaultValue={editing?.precio_doble ?? 130} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_familiar" className="text-xs">Familiar $</Label>
                <Input id="precio_familiar" name="precio_familiar" type="number" step="0.01" min="0" defaultValue={editing?.precio_familiar ?? 260} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="piezas_individual" className="text-xs">Piezas Indiv</Label>
                <Input id="piezas_individual" name="piezas_individual" type="number" min="1" defaultValue={editing?.piezas_individual ?? 1} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="piezas_doble" className="text-xs">Piezas Doble</Label>
                <Input id="piezas_doble" name="piezas_doble" type="number" min="1" defaultValue={editing?.piezas_doble ?? 2} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="piezas_familiar" className="text-xs">Piezas Familiar</Label>
                <Input id="piezas_familiar" name="piezas_familiar" type="number" min="1" defaultValue={editing?.piezas_familiar ?? 4} required />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-[var(--color-muted)]/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Complementos / guarniciones</p>
              <Button type="button" size="sm" variant="outline" onClick={addComp}>
                <Plus className="h-4 w-4" /> Añadir
              </Button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Ej.: Frijol — unidad: lt — Individual: 0.25 — Doble: 0.5 — Familiar: 1. Cocina verá la sumatoria por menú.
            </p>
            {complementos.length === 0 && (
              <p className="text-sm text-[var(--color-muted-foreground)]">Sin complementos.</p>
            )}
            {complementos.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_60px_60px_60px_40px] gap-2 items-end">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={c.nombre}
                    onChange={(e) => updateComp(i, { nombre: e.target.value })}
                    placeholder="Frijol"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Unidad</Label>
                  <Input
                    value={c.unidad ?? ""}
                    onChange={(e) => updateComp(i, { unidad: e.target.value || null })}
                    placeholder="lt"
                  />
                </div>
                <div>
                  <Label className="text-xs">Indiv</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={c.cantidad_individual}
                    onChange={(e) => updateComp(i, { cantidad_individual: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Doble</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={c.cantidad_doble}
                    onChange={(e) => updateComp(i, { cantidad_doble: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fam</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={c.cantidad_familiar}
                    onChange={(e) => updateComp(i, { cantidad_familiar: Number(e.target.value) || 0 })}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeComp(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
