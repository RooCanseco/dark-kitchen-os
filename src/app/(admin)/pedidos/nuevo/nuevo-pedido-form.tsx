"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Minus, Trash2, User, MapPin, ShoppingBag, Tag, Check, Loader2,
  Truck, Store, UtensilsCrossed,
} from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { PAQUETE_LABEL, precioPaquete, piezasPaquete } from "@/lib/paquetes";
import { PlacesAutocomplete, type PlaceResult } from "@/components/places-autocomplete";
import {
  searchClientes, crearCliente, crearDireccion, tarifaParaDistancia,
  actualizarDireccionConDistancia, crearPedido, calcularDistanciaServer,
  getClienteConDirecciones,
} from "../actions";
import type {
  Menu, TagExcepcion, Sucursal, Cliente, Direccion, PaqueteTipo, TipoEntrega,
} from "@/lib/supabase/types";

type ClienteConDirs = Cliente & { direcciones: Direccion[] };
type ItemDraft = {
  tempId: string;
  paquete_tipo: PaqueteTipo;
  cantidad: number;
  precio_unitario: number;
  piezas_por_paquete: number;
  modificadores: Array<{ tag_excepcion_id: string; cantidad: number }>;
};

export function NuevoPedidoForm({
  menus,
  tags,
  sucursal,
  preselectedClienteId,
}: {
  menus: Menu[];
  tags: TagExcepcion[];
  sucursal: Sucursal;
  preselectedClienteId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Step 0 — menú activo
  const [menuId, setMenuId] = useState<string>(menus[0].id);
  const menu = menus.find((m) => m.id === menuId) ?? menus[0];

  // Step 1 — cliente
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClienteConDirs[]>([]);
  const [cliente, setCliente] = useState<ClienteConDirs | null>(null);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);

  // Step 2 — tipo entrega + dirección
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("entrega");
  const [direccion, setDireccion] = useState<Direccion | null>(null);
  const [showNuevaDireccion, setShowNuevaDireccion] = useState(false);

  // Step 3 — items
  const [items, setItems] = useState<ItemDraft[]>([]);

  // Step 4 — observaciones
  const [observaciones, setObservaciones] = useState("");

  // Cargar cliente preseleccionado (desde /clientes/[id]?cliente=...)
  useEffect(() => {
    if (!preselectedClienteId) return;
    (async () => {
      try {
        const c = await getClienteConDirecciones(preselectedClienteId);
        if (c) {
          const cc = c as ClienteConDirs;
          setCliente(cc);
          if (cc.direcciones.length === 1) setDireccion(cc.direcciones[0]);
        }
      } catch {}
    })();
  }, [preselectedClienteId]);

  useEffect(() => {
    if (query.length < 2 || cliente) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const found = await searchClientes(query);
        if (!cancelled) setResults(found as ClienteConDirs[]);
      } catch {}
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, cliente]);

  function selectCliente(c: ClienteConDirs) {
    setCliente(c);
    setResults([]);
    setQuery("");
    if (c.direcciones.length === 1) setDireccion(c.direcciones[0]);
  }

  function resetCliente() {
    setCliente(null);
    setDireccion(null);
    setItems([]);
    setShowNuevoCliente(false);
    setShowNuevaDireccion(false);
    setTipoEntrega("entrega");
  }

  const totalPlatillos = items.reduce((sum, i) => sum + i.cantidad * i.precio_unitario, 0);
  const totalEnvio = tipoEntrega === "pickup" ? 0 : Number(direccion?.costo_envio_calculado ?? 0);
  const granTotal = totalPlatillos + totalEnvio;

  // Para avanzar de step:
  // entrega: requiere direccion
  // pickup: no requiere direccion
  const direccionListaOSkip = tipoEntrega === "pickup" ? true : !!direccion;

  function addItem(tipo: PaqueteTipo) {
    setItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        paquete_tipo: tipo,
        cantidad: 1,
        precio_unitario: precioPaquete(menu, tipo),
        piezas_por_paquete: piezasPaquete(menu, tipo),
        modificadores: [],
      },
    ]);
  }

  function updateItem(tempId: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i)));
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  function toggleMod(tempId: string, tag_excepcion_id: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.tempId !== tempId) return i;
        const existing = i.modificadores.find((m) => m.tag_excepcion_id === tag_excepcion_id);
        const piezas = i.piezas_por_paquete * i.cantidad;
        if (existing) {
          return { ...i, modificadores: i.modificadores.filter((m) => m.tag_excepcion_id !== tag_excepcion_id) };
        }
        return {
          ...i,
          modificadores: [...i.modificadores, { tag_excepcion_id, cantidad: piezas }],
        };
      }),
    );
  }

  function updateModQty(tempId: string, tag_excepcion_id: string, cantidad: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.tempId !== tempId) return i;
        return {
          ...i,
          modificadores: i.modificadores.map((m) =>
            m.tag_excepcion_id === tag_excepcion_id ? { ...m, cantidad } : m,
          ),
        };
      }),
    );
  }

  function canSubmit() {
    return cliente && direccionListaOSkip && items.length > 0 && items.every((i) => i.cantidad > 0);
  }

  function onConfirm() {
    if (!cliente) return;
    if (tipoEntrega === "entrega" && !direccion) return;
    startTransition(async () => {
      try {
        const { pedido_id } = await crearPedido({
          cliente_id: cliente.id,
          direccion_id: tipoEntrega === "entrega" ? direccion!.id : null,
          menu_id: menu.id,
          tipo_entrega: tipoEntrega,
          observaciones_texto: observaciones || null,
          total_envio: totalEnvio,
          items: items.map((i) => ({
            paquete_tipo: i.paquete_tipo,
            cantidad: i.cantidad,
            piezas_por_paquete: i.piezas_por_paquete,
            precio_unitario: i.precio_unitario,
            modificadores: i.modificadores,
          })),
        });
        toast.success("Pedido creado");
        router.push(`/pedidos/${pedido_id}`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {menus.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UtensilsCrossed className="h-4 w-4" /> Menú
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={menuId} onValueChange={(v) => { setMenuId(v); setItems([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {menus.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                Cambiar de menú vacía los items capturados.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs text-[var(--color-primary-foreground)]">1</span>
              <User className="h-4 w-4" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cliente ? (
              <div className="flex items-start justify-between rounded-md border bg-[var(--color-muted)]/30 p-3">
                <div>
                  <p className="font-semibold">{cliente.nombre}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{cliente.telefono}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={resetCliente}>Cambiar</Button>
              </div>
            ) : showNuevoCliente ? (
              <NuevoClienteForm
                onCancel={() => setShowNuevoCliente(false)}
                onCreated={(c) => {
                  setCliente({ ...c, direcciones: [] });
                  setShowNuevoCliente(false);
                  setShowNuevaDireccion(true);
                }}
              />
            ) : (
              <>
                <Input
                  placeholder="Buscar por nombre o teléfono"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {results.length > 0 && (
                  <div className="space-y-1 rounded-md border bg-[var(--color-background)] p-1">
                    {results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCliente(c)}
                        className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-accent)]"
                      >
                        <div className="font-medium">{c.nombre}</div>
                        <div className="text-xs text-[var(--color-muted-foreground)]">
                          {c.telefono} · {c.direcciones.length} dirección{c.direcciones.length === 1 ? "" : "es"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowNuevoCliente(true)}>
                  <Plus className="h-4 w-4" /> Nuevo cliente
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {cliente && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs text-[var(--color-primary-foreground)]">2</span>
                <Truck className="h-4 w-4" /> Tipo de entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <TipoBtn active={tipoEntrega === "entrega"} onClick={() => setTipoEntrega("entrega")} icon={Truck} label="Entrega a domicilio" />
                <TipoBtn active={tipoEntrega === "pickup"} onClick={() => { setTipoEntrega("pickup"); setDireccion(null); }} icon={Store} label="Recoge en sucursal" />
              </div>

              {tipoEntrega === "entrega" && (
                <div className="space-y-3 border-t pt-3">
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <MapPin className="h-3 w-3" /> Dirección
                  </p>
                  {direccion ? (
                    <div className="flex items-start justify-between rounded-md border bg-[var(--color-muted)]/30 p-3">
                      <div>
                        <p className="font-semibold">{direccion.alias}</p>
                        <p className="text-sm">{direccion.calle_y_numero}</p>
                        {direccion.referencias && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">Ref: {direccion.referencias}</p>
                        )}
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          {direccion.distancia_km != null ? `${Number(direccion.distancia_km).toFixed(2)} km · ` : ""}
                          {direccion.duracion_min != null ? `${direccion.duracion_min} min · ` : ""}
                          Envío: {formatMoney(direccion.costo_envio_calculado)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDireccion(null)}>Cambiar</Button>
                    </div>
                  ) : showNuevaDireccion ? (
                    <NuevaDireccionForm
                      cliente_id={cliente.id}
                      sucursal={sucursal}
                      onCancel={() => setShowNuevaDireccion(false)}
                      onCreated={(d) => {
                        setCliente((prev) => prev ? { ...prev, direcciones: [...prev.direcciones, d] } : prev);
                        setDireccion(d);
                        setShowNuevaDireccion(false);
                      }}
                    />
                  ) : (
                    <>
                      <div className="space-y-1">
                        {cliente.direcciones.length === 0 ? (
                          <p className="text-sm text-[var(--color-muted-foreground)]">Sin direcciones.</p>
                        ) : (
                          cliente.direcciones.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setDireccion(d)}
                              className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-[var(--color-accent)]"
                            >
                              <div className="font-medium">{d.alias}</div>
                              <div className="text-xs text-[var(--color-muted-foreground)]">{d.calle_y_numero}</div>
                            </button>
                          ))
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowNuevaDireccion(true)}>
                        <Plus className="h-4 w-4" /> Nueva dirección
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {cliente && direccionListaOSkip && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs text-[var(--color-primary-foreground)]">3</span>
                <ShoppingBag className="h-4 w-4" /> Paquetes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["individual", "doble", "familiar"] as PaqueteTipo[]).map((tipo) => (
                  <Button key={tipo} variant="outline" size="sm" onClick={() => addItem(tipo)}>
                    <Plus className="h-4 w-4" />
                    {PAQUETE_LABEL[tipo]} · {formatMoney(precioPaquete(menu, tipo))} · {piezasPaquete(menu, tipo)} pza{piezasPaquete(menu, tipo) === 1 ? "" : "s"}
                  </Button>
                ))}
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <ItemRow
                    key={item.tempId}
                    item={item}
                    tags={tags}
                    onUpdate={(patch) => updateItem(item.tempId, patch)}
                    onRemove={() => removeItem(item.tempId)}
                    onToggleMod={(id) => toggleMod(item.tempId, id)}
                    onUpdateModQty={(id, qty) => updateModQty(item.tempId, id, qty)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-[var(--color-muted-foreground)]">Agrega al menos un paquete.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observaciones (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas no críticas. Para instrucciones de cocina usa los tags."
                rows={2}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Menú</span>
              <span className="text-right">{menu.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Tipo</span>
              <Badge variant="outline">{tipoEntrega === "pickup" ? "Pickup" : "Entrega"}</Badge>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-[var(--color-muted-foreground)]">Platillos</span>
              <span>{formatMoney(totalPlatillos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted-foreground)]">Envío</span>
              <span>{formatMoney(totalEnvio)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(granTotal)}</span>
            </div>
            <Button className="mt-3 w-full" size="lg" onClick={onConfirm} disabled={!canSubmit() || pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "Creando..." : "Confirmar pedido"}
            </Button>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              El método de pago se asigna al entregar.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function TipoBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 items-center justify-center gap-2 rounded-md border-2 text-sm font-semibold transition-colors",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
          : "border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)]",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function NuevoClienteForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (c: Cliente) => void;
}) {
  const [pending, startTransition] = useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const c = await crearCliente({
          nombre: fd.get("nombre") as string,
          telefono: fd.get("telefono") as string,
        });
        toast.success("Cliente creado");
        onCreated(c as Cliente);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-[var(--color-muted)]/20 p-3">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input id="telefono" name="telefono" required type="tel" inputMode="tel" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando..." : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}

function NuevaDireccionForm({
  cliente_id,
  sucursal,
  onCancel,
  onCreated,
}: {
  cliente_id: string;
  sucursal: Sucursal;
  onCancel: () => void;
  onCreated: (d: Direccion) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [calcInfo, setCalcInfo] = useState<{
    distancia_km: number; duracion_min: number; costo: number; es_cotizacion: boolean;
  } | null>(null);
  const [calcPending, setCalcPending] = useState(false);

  function onPlaceSelect(p: PlaceResult) {
    setPlace(p);
    setCalcInfo(null);
    if (sucursal.lat == null || sucursal.lng == null) {
      toast.warning("Sin coords de sucursal.");
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
        if (es_cotizacion) toast.warning("Fuera de rango. Cotizar manualmente.");
      } catch (err) {
        toast.error("No se pudo calcular distancia: " + (err as Error).message);
      } finally {
        setCalcPending(false);
      }
    })();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!place) {
      toast.error("Selecciona una dirección del autocompletar");
      return;
    }
    startTransition(async () => {
      try {
        const d = await crearDireccion({
          cliente_id,
          alias: fd.get("alias") as string,
          calle_y_numero: place.formatted_address,
          referencias: (fd.get("referencias") as string) || null,
          lat: place.lat,
          lng: place.lng,
        });
        if (calcInfo) {
          try {
            await actualizarDireccionConDistancia({
              direccion_id: d.id,
              distancia_km: calcInfo.distancia_km,
              duracion_min: calcInfo.duracion_min,
              costo_envio_calculado: calcInfo.costo,
            });
            d.distancia_km = calcInfo.distancia_km;
            d.duracion_min = calcInfo.duracion_min;
            d.costo_envio_calculado = calcInfo.costo;
          } catch {}
        }
        const url = (fd.get("url_ubicacion") as string) || null;
        if (url) {
          // Persistir url_ubicacion via segunda llamada (sin cambiar firma de crearDireccion)
          // Lo dejamos pendiente; el operador puede editarlo desde el perfil.
        }
        onCreated(d as Direccion);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border bg-[var(--color-muted)]/20 p-3">
      <div className="space-y-2">
        <Label htmlFor="alias">Alias</Label>
        <Input id="alias" name="alias" required placeholder="Casa, Oficina..." />
      </div>
      <PlacesAutocomplete label="Dirección (selecciona del autocompletar)" onSelect={onPlaceSelect} />
      {place && (
        <div className="rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-2 text-xs">
          <p className="font-medium">✓ {place.formatted_address}</p>
          {calcPending && <p className="mt-1 text-[var(--color-muted-foreground)]">Calculando envío...</p>}
          {calcInfo && !calcPending && (
            <p className="mt-1 text-[var(--color-muted-foreground)]">
              {calcInfo.distancia_km.toFixed(2)} km · {calcInfo.duracion_min} min ·{" "}
              {calcInfo.es_cotizacion ? "Cotización manual" : `Envío ${formatMoney(calcInfo.costo)}`}
            </p>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="referencias">Referencias (opcional)</Label>
        <Input id="referencias" name="referencias" placeholder="Casa color blanco, portón negro..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url_ubicacion">URL de ubicación (opcional)</Label>
        <Input id="url_ubicacion" name="url_ubicacion" type="url" placeholder="https://maps.app.goo.gl/..." />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={pending || !place || calcPending}>
          {pending ? "Guardando..." : !place ? "Selecciona dirección" : "Guardar dirección"}
        </Button>
      </div>
    </form>
  );
}

function ItemRow({
  item,
  tags,
  onUpdate,
  onRemove,
  onToggleMod,
  onUpdateModQty,
}: {
  item: ItemDraft;
  tags: TagExcepcion[];
  onUpdate: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
  onToggleMod: (id: string) => void;
  onUpdateModQty: (id: string, qty: number) => void;
}) {
  const piezasTotales = item.piezas_por_paquete * item.cantidad;
  return (
    <div className="rounded-md border bg-[var(--color-muted)]/10 p-3">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{PAQUETE_LABEL[item.paquete_tipo]}</Badge>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onUpdate({ cantidad: Math.max(1, item.cantidad - 1) })}
            className="h-7 w-7"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onUpdate({ cantidad: item.cantidad + 1 })}
            className="h-7 w-7"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {piezasTotales} pieza{piezasTotales === 1 ? "" : "s"}
        </span>
        <span className="ml-auto font-medium">{formatMoney(item.cantidad * item.precio_unitario)}</span>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {tags.map((t) => {
          const mod = item.modificadores.find((m) => m.tag_excepcion_id === t.id);
          const active = !!mod;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggleMod(t.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)]",
              )}
            >
              {active && <Check className="h-3 w-3" />}
              <Tag className="h-3 w-3" />
              {t.etiqueta}
            </button>
          );
        })}
      </div>
      {item.modificadores.length > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2 text-xs text-[var(--color-muted-foreground)]">
          {item.modificadores.map((m) => {
            const tag = tags.find((t) => t.id === m.tag_excepcion_id);
            return (
              <div key={m.tag_excepcion_id} className="flex items-center gap-2">
                <span>{tag?.etiqueta}:</span>
                <Input
                  type="number"
                  min={1}
                  max={piezasTotales}
                  value={m.cantidad}
                  onChange={(e) => onUpdateModQty(m.tag_excepcion_id, Math.max(1, Number(e.target.value) || 1))}
                  className="h-6 w-16"
                />
                <span>de {piezasTotales} piezas</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
