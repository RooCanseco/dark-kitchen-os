"use client";

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key || key.startsWith("TODO")) {
    throw new Error("Google Maps key no configurada");
  }
  setOptions({ key, v: "weekly", language: "es", region: "MX", libraries: ["places"] });
  configured = true;
}

export async function loadPlaces() {
  ensureConfigured();
  return importLibrary("places");
}

export async function loadCore() {
  ensureConfigured();
  return importLibrary("core");
}

export interface DistanceResult {
  distancia_km: number;
  duracion_min: number;
}

export async function calcularDistancia(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<DistanceResult> {
  ensureConfigured();
  const routes = await importLibrary("routes");
  const service = new routes.DistanceMatrixService();
  const result = await service.getDistanceMatrix({
    origins: [origin],
    destinations: [destination],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
  });
  const row = result.rows?.[0]?.elements?.[0];
  if (!row || row.status !== "OK") {
    throw new Error("No se pudo calcular distancia");
  }
  return {
    distancia_km: row.distance.value / 1000,
    duracion_min: Math.round(row.duration.value / 60),
  };
}
