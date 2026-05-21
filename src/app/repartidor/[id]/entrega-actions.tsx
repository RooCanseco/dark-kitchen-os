"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Banknote, ArrowRightLeft } from "lucide-react";
import { marcarEntregado } from "../actions";
import type { MetodoPago, EstadoOperativo } from "@/lib/supabase/types";

const OPCIONES: { value: MetodoPago; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "transferencia", label: "Transferencia", icon: ArrowRightLeft },
];

export function EntregaActions({
  pedido_id,
  estado,
  metodo_actual,
}: {
  pedido_id: string;
  estado: EstadoOperativo;
  metodo_actual: MetodoPago | null;
}) {
  const [metodo, setMetodo] = useState<MetodoPago | null>(metodo_actual);
  const [pending, startTransition] = useTransition();

  if (estado === "entregado") {
    return (
      <Card className="border-[var(--color-success)]/30 bg-[var(--color-success)]/5">
        <CardContent className="flex items-center gap-2 p-4 text-[var(--color-success)]">
          <CheckCircle2 className="h-5 w-5" /> Entregado
        </CardContent>
      </Card>
    );
  }

  function onSubmit() {
    if (!metodo) {
      toast.error("Selecciona el método de pago primero");
      return;
    }
    startTransition(async () => {
      try {
        await marcarEntregado(pedido_id, metodo);
        toast.success("Pedido entregado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Método de pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {OPCIONES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMetodo(value)}
              className={cn(
                "flex h-14 items-center justify-center gap-2 rounded-md border-2 text-base font-semibold transition-colors",
                metodo === value
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-accent)]",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
        <Button
          size="xl"
          className="h-16 w-full text-lg"
          variant="success"
          disabled={!metodo || pending}
          onClick={onSubmit}
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          {pending ? "Marcando..." : "Marcar entregado"}
        </Button>
        {!metodo && (
          <p className="text-center text-xs text-[var(--color-muted-foreground)]">
            Selecciona el método de pago para activar el botón.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
