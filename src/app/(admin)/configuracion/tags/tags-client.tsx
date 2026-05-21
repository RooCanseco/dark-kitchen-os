"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { upsertTag, deleteTag } from "../actions";
import type { TagExcepcion } from "@/lib/supabase/types";

export function TagsClient({ tags }: { tags: TagExcepcion[] }) {
  const [editing, setEditing] = useState<TagExcepcion | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este tag?")) return;
    startTransition(async () => {
      try {
        await deleteTag(id);
        toast.success("Tag eliminado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tags de excepción</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Instrucciones tipadas que la cocina ve agregadas. Reemplazan al texto libre.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo tag
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-[var(--color-muted-foreground)]">
                    Sin tags configurados.
                  </TableCell>
                </TableRow>
              )}
              {tags.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">[{t.etiqueta}]</TableCell>
                  <TableCell>
                    {t.activo ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
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

      <TagDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function TagDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TagExcepcion | null;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await upsertTag({
          id: editing?.id,
          etiqueta: fd.get("etiqueta") as string,
          activo: fd.get("activo") === "on",
        });
        toast.success(editing ? "Tag actualizado" : "Tag creado");
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
          <DialogTitle>{editing ? "Editar tag" : "Nuevo tag"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="etiqueta">Etiqueta</Label>
            <Input id="etiqueta" name="etiqueta" defaultValue={editing?.etiqueta ?? ""} required placeholder="Sin crema" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="activo" defaultChecked={editing?.activo ?? true} className="h-4 w-4" />
            Activo
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
