"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Phone, MapPin, Plus, Pencil, Trash2, ExternalLink, Clock, User, MessageCircle } from "lucide-react";
import { formatMoney, whatsAppLink } from "@/lib/utils";
import { PlacesAutocomplete, type PlaceResult } from "@/components/places-autocomplete";
import { upsertCliente, upsertDireccion, deleteDireccion } from "../actions";
import { calcularDistanciaServer, tarifaParaDistancia } from "@/app/(admin)/pedidos/actions";
import type { Cliente, Direccion, Sucursal } from "@/lib/supabase/types";

export function ClienteDetalle({
  cliente,
  direcciones,
  sucursal,
}: {
  cliente: Cliente;
  direcciones: Direccion[];
  sucursal: Sucursal;
}) {
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [editDirOpen, setEditDirOpen] = useState(false);
  const [editingDir, setEditingDir] = useState<Direccion | null>(null);
  const [pending, startTransition] = useTransition();

  function onDeleteDir(id: string) {
    if (!confirm("¿Eliminar esta dirección?")) return;
    startTransition(async () => {
      try {
        await deleteDireccion(id, cliente.id);
        toast.success("Dirección eliminada");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <Badge variant="secondary"><User className="mr-1 h-3 w-3" /> Cliente</Badge>
            <CardTitle className="mt-2">{cliente.nombre}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`tel:${cliente.telefono}`}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-[var(--color-accent)]"
              >
                <Phone className="h-3 w-3" /> {cliente.telefono}
              </a>
              <a
                href={whatsAppLink(cliente.telefono)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[#25D366]/30 bg-[#25D366]/10 px-2 py-1 text-xs text-[#1B9C4D] hover:bg-[#25D366]/20"
              >
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </a>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setEditClienteOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="md:row-span-2">
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="text-base">
            Direcciones ({direcciones.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingDir(null);
              setEditDirOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {direcciones.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Sin direcciones registradas.</p>
          )}
          {direcciones.map((d) => (
            <div key={d.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="font-semibold">{d.alias}</span>
                  </div>
                  <p className="mt-1 text-sm">{d.calle_y_numero}</p>
                  {d.referencias && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">Ref: {d.referencias}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    {d.distancia_km != null && (
                      <Badge variant="outline">{Number(d.distancia_km).toFixed(2)} km</Badge>
                    )}
                    {d.duracion_min != null && (
                      <Badge variant="outline">
                        <Clock className="mr-1 h-3 w-3" /> {d.duracion_min} min
                      </Badge>
                    )}
                    <Badge variant="outline">Envío {formatMoney(d.costo_envio_calculado)}</Badge>
                    {d.url_ubicacion && (
                      <a
                        href={d.url_ubicacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver mapa
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingDir(d); setEditDirOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteDir(d.id)} disabled={pending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ClienteDialog cliente={cliente} open={editClienteOpen} onOpenChange={setEditClienteOpen} />
      <DireccionDialog
        cliente_id={cliente.id}
        sucursal={sucursal}
        editing={editingDir}
        open={editDirOpen}
        onOpenChange={setEditDirOpen}
      />
    </div>
  );
}

function ClienteDialog({
  cliente,
  open,
  onOpenChange,
}: {
  cliente: Cliente;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await upsertCliente({
          id: cliente.id,
          nombre: fd.get("nombre") as string,
          telefono: fd.get("telefono") as string,
        });
        toast.success("Cliente actualizado");
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
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={cliente.nombre} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" type="tel" defaultValue={cliente.telefono} required />
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

function DireccionDialog({
  cliente_id,
  sucursal,
  editing,
  open,
  onOpenChange,
}: {
  cliente_id: string;
  sucursal: Sucursal;
  editing: Direccion | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [place, setPlace] = useState<PlaceResult | null>(
    editing && editing.lat != null && editing.lng != null
      ? { formatted_address: editing.calle_y_numero, lat: Number(editing.lat), lng: Number(editing.lng) }
      : null,
  );
  const [calcInfo, setCalcInfo] = useState<{
    distancia_km: number; duracion_min: number; costo: number; es_cotizacion: boolean;
  } | null>(
    editing && editing.distancia_km != null
      ? {
          distancia_km: Number(editing.distancia_km),
          duracion_min: Number(editing.duracion_min ?? 0),
          costo: Number(editing.costo_envio_calculado),
          es_cotizacion: false,
        }
      : null,
  );
  const [calcPending, setCalcPending] = useState(false);

  function onPlaceSelect(p: PlaceResult) {
    setPlace(p);
    setCalcInfo(null);
    if (sucursal.lat == null || sucursal.lng == null) {
      toast.warning("Sin coords de sucursal");
      return;
    }
    setCalcPending(true);
    (async () => {
      try {
        const dist = await calcularDistanciaServer(
          { lat: Number(sucursal.lat), lng: Number(sucursal.lng) },
          { lat: p.lat, lng: p.lng },
        );
        const tarifa = await tarifaParaDistancia(dist.distancia_km);
        const es_cotizacion = !!tarifa?.es_cotizacion;
        const costo = es_cotizacion ? 0 : Number(tarifa?.costo ?? 0);
        setCalcInfo({
          distancia_km: dist.distancia_km,
          duracion_min: dist.duracion_min,
          costo,
          es_cotizacion,
        });
        if (es_cotizacion) toast.warning("Fuera de rango — cotizar manualmente");
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setCalcPending(false);
      }
    })();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!place && !editing) {
      toast.error("Selecciona una dirección del autocompletar");
      return;
    }
    startTransition(async () => {
      try {
        await upsertDireccion({
          id: editing?.id,
          cliente_id,
          alias: fd.get("alias") as string,
          calle_y_numero: place?.formatted_address ?? editing!.calle_y_numero,
          referencias: (fd.get("referencias") as string) || null,
          lat: place?.lat ?? (editing?.lat != null ? Number(editing.lat) : null),
          lng: place?.lng ?? (editing?.lng != null ? Number(editing.lng) : null),
          distancia_km: calcInfo?.distancia_km ?? (editing?.distancia_km != null ? Number(editing.distancia_km) : null),
          duracion_min: calcInfo?.duracion_min ?? editing?.duracion_min ?? null,
          costo_envio_calculado: calcInfo?.costo ?? Number(editing?.costo_envio_calculado ?? 0),
          url_ubicacion: (fd.get("url_ubicacion") as string) || null,
        });
        toast.success(editing ? "Dirección actualizada" : "Dirección creada");
        onOpenChange(false);
        setPlace(null);
        setCalcInfo(null);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar dirección" : "Nueva dirección"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input id="alias" name="alias" defaultValue={editing?.alias ?? ""} required placeholder="Casa, Oficina..." />
          </div>
          {editing && (
            <div className="rounded-md border bg-[var(--color-muted)]/20 p-2 text-xs">
              <p className="font-medium">Dirección actual:</p>
              <p>{editing.calle_y_numero}</p>
              <p className="mt-1 text-[var(--color-muted-foreground)]">
                Cambia el alias / referencias / URL sin tocar autocomplete, o selecciona una nueva dirección abajo para reemplazar.
              </p>
            </div>
          )}
          <PlacesAutocomplete
            label={editing ? "Cambiar dirección (opcional)" : "Dirección"}
            onSelect={onPlaceSelect}
          />
          {place && (
            <div className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-2 text-xs">
              <p className="font-medium">✓ {place.formatted_address}</p>
              {calcPending && <p className="mt-1">Calculando envío...</p>}
              {calcInfo && !calcPending && (
                <p className="mt-1 text-[var(--color-muted-foreground)]">
                  {calcInfo.distancia_km.toFixed(2)} km · {calcInfo.duracion_min} min ·{" "}
                  {calcInfo.es_cotizacion ? "Cotización" : `Envío ${formatMoney(calcInfo.costo)}`}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="referencias">Referencias (opcional)</Label>
            <Textarea id="referencias" name="referencias" defaultValue={editing?.referencias ?? ""} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url_ubicacion">URL de ubicación (opcional)</Label>
            <Input
              id="url_ubicacion"
              name="url_ubicacion"
              type="url"
              defaultValue={editing?.url_ubicacion ?? ""}
              placeholder="https://maps.app.goo.gl/..."
            />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Pega el link compartido de Google Maps si tienes uno.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending || calcPending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
