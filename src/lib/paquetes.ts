import type { PaqueteTipo } from "@/lib/supabase/types";

export const PAQUETE_LABEL: Record<PaqueteTipo, string> = {
  individual: "Individual",
  doble: "Doble",
  familiar: "Familiar",
};

interface MenuPrecios {
  precio_individual: number;
  precio_doble: number;
  precio_familiar: number;
}

interface MenuPiezas {
  piezas_individual: number;
  piezas_doble: number;
  piezas_familiar: number;
}

export function precioPaquete(menu: MenuPrecios, tipo: PaqueteTipo): number {
  if (tipo === "individual") return Number(menu.precio_individual);
  if (tipo === "doble") return Number(menu.precio_doble);
  return Number(menu.precio_familiar);
}

export function piezasPaquete(menu: MenuPiezas, tipo: PaqueteTipo): number {
  if (tipo === "individual") return Number(menu.piezas_individual);
  if (tipo === "doble") return Number(menu.piezas_doble);
  return Number(menu.piezas_familiar);
}
