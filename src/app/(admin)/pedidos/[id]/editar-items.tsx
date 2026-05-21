"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Tag, Check, Minus } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { PAQUETE_LABEL, precioPaquete, piezasPaquete } from "@/lib/paquetes";
import { agregarItem, eliminarItem, actualizarCantidadItem } from "../actions";
import type { Menu, TagExcepcion, PaqueteTipo } from "@/lib/supabase/types";

interface ItemServer {
  id: string;
  paquete_tipo: string;
  cantidad: number;
  piezas_por_paquete: number;
  precio_unitario: number;
  pedido_item_modificadores: Array<{
    id: string;
    cantidad: number;
    menu_tags_excepcion: { etiqueta: string } | null;
  }>;
}

export function EditarItems({
  pedido_id,
  items,
  menu,
  tags,
  editable,
}: {
  pedido_id: string;
  items: ItemServer[];
  menu: Menu | null;
  tags: TagExcepcion[];
  editable: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Items</CardTitle>
        {editable && menu && !showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Añadir item
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ItemEditable key={item.id} pedido_id={pedido_id} item={item} editable={editable} />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-[var(--color-muted-foreground)]">Sin items.</p>
        )}
        {showAdd && menu && (
          <AgregarItemForm
            pedido_id={pedido_id}
            menu={menu}
            tags={tags}
            onCancel={() => setShowAdd(false)}
            onDone={() => setShowAdd(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ItemEditable({
  pedido_id,
  item,
  editable,
}: {
  pedido_id: string;
  item: ItemServer;
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function setCantidad(c: number) {
    if (c < 1) return;
    startTransition(async () => {
      try {
        await actualizarCantidadItem(pedido_id, item.id, c);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function onRemove() {
    if (!confirm("¿Eliminar este item?")) return;
    startTransition(async () => {
      try {
        await eliminarItem(pedido_id, item.id);
        toast.success("Item eliminado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{PAQUETE_LABEL[item.paquete_tipo as PaqueteTipo]}</Badge>
        {editable ? (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(item.cantidad - 1)} disabled={pending || item.cantidad <= 1}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(item.cantidad + 1)} disabled={pending}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-sm">× {item.cantidad}</span>
        )}
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {item.piezas_por_paquete * item.cantidad} pza{item.piezas_por_paquete * item.cantidad === 1 ? "" : "s"}
        </span>
        <span className="ml-auto font-medium">
          {formatMoney(item.cantidad * Number(item.precio_unitario))}
        </span>
        {editable && (
          <Button variant="ghost" size="icon" onClick={onRemove} disabled={pending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {item.pedido_item_modificadores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
          {item.pedido_item_modificadores.map((mod) => (
            <Badge key={mod.id} variant="outline">
              [{mod.menu_tags_excepcion?.etiqueta}] × {mod.cantidad}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function AgregarItemForm({
  pedido_id,
  menu,
  tags,
  onCancel,
  onDone,
}: {
  pedido_id: string;
  menu: Menu;
  tags: TagExcepcion[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [tipo, setTipo] = useState<PaqueteTipo>("individual");
  const [cantidad, setCantidad] = useState(1);
  const [mods, setMods] = useState<Array<{ tag_excepcion_id: string; cantidad: number }>>([]);
  const [pending, startTransition] = useTransition();
  const piezas = piezasPaquete(menu, tipo);
  const totalPiezas = piezas * cantidad;

  function toggleMod(tag_id: string) {
    setMods((prev) => {
      const existing = prev.find((m) => m.tag_excepcion_id === tag_id);
      if (existing) return prev.filter((m) => m.tag_excepcion_id !== tag_id);
      return [...prev, { tag_excepcion_id: tag_id, cantidad: totalPiezas }];
    });
  }

  function onSubmit() {
    startTransition(async () => {
      try {
        await agregarItem({
          pedido_id,
          paquete_tipo: tipo,
          cantidad,
          piezas_por_paquete: piezas,
          precio_unitario: precioPaquete(menu, tipo),
          modificadores: mods,
        });
        toast.success("Item añadido");
        onDone();
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-[var(--color-muted)]/20 p-3">
      <div className="flex flex-wrap gap-2">
        {(["individual", "doble", "familiar"] as PaqueteTipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              tipo === t
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "border-[var(--color-border)] hover:bg-[var(--color-accent)]",
            )}
          >
            {PAQUETE_LABEL[t]} · {formatMoney(precioPaquete(menu, t))}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span>Cantidad:</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(Math.max(1, cantidad - 1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-medium">{cantidad}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCantidad(cantidad + 1)}>
          <Plus className="h-3 w-3" />
        </Button>
        <span className="text-xs text-[var(--color-muted-foreground)]">{totalPiezas} pieza{totalPiezas === 1 ? "" : "s"}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => {
          const active = mods.some((m) => m.tag_excepcion_id === t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleMod(t.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-accent)]",
              )}
            >
              {active && <Check className="h-3 w-3" />}
              <Tag className="h-3 w-3" />
              {t.etiqueta}
            </button>
          );
        })}
      </div>
      {mods.length > 0 && (
        <div className="space-y-1 border-t pt-2 text-xs text-[var(--color-muted-foreground)]">
          {mods.map((m) => {
            const tag = tags.find((t) => t.id === m.tag_excepcion_id);
            return (
              <div key={m.tag_excepcion_id} className="flex items-center gap-2">
                <span>{tag?.etiqueta}:</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPiezas}
                  value={m.cantidad}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value) || 1);
                    setMods((prev) => prev.map((mm) => mm.tag_excepcion_id === m.tag_excepcion_id ? { ...mm, cantidad: v } : mm));
                  }}
                  className="h-6 w-16"
                />
                <span>de {totalPiezas}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={onSubmit} disabled={pending}>
          {pending ? "Añadiendo..." : "Añadir al pedido"}
        </Button>
      </div>
    </div>
  );
}
