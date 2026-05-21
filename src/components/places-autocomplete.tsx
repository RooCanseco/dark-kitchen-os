"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { loadPlaces } from "@/lib/google-maps";
import { AlertTriangle } from "lucide-react";

export interface PlaceResult {
  formatted_address: string;
  lat: number;
  lng: number;
}

interface PlaceAutocompleteElement extends HTMLElement {
  value: string;
  includedRegionCodes?: string[];
  requestedLanguage?: string;
  requestedRegion?: string;
}

interface GmpSelectEvent extends Event {
  placePrediction: {
    toPlace: () => {
      fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
      formattedAddress: string | null;
      location: { lat: () => number; lng: () => number } | null;
    };
  };
}

export function PlacesAutocomplete({
  label = "Dirección",
  defaultValue = "",
  onSelect,
}: {
  label?: string;
  defaultValue?: string;
  onSelect: (place: PlaceResult) => void;
  required?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    let element: PlaceAutocompleteElement | null = null;
    let cancelled = false;

    loadPlaces()
      .then((places) => {
        if (cancelled || !containerRef.current) return;
        const Ctor = (places as unknown as {
          PlaceAutocompleteElement: new (opts?: {
            includedRegionCodes?: string[];
            requestedLanguage?: string;
            requestedRegion?: string;
          }) => PlaceAutocompleteElement;
        }).PlaceAutocompleteElement;
        element = new Ctor({
          includedRegionCodes: ["mx"],
          requestedLanguage: "es",
          requestedRegion: "mx",
        });
        if (defaultValue) element.value = defaultValue;

        element.addEventListener("gmp-select", async (evt) => {
          console.log("[places] gmp-select fired", evt);
          const event = evt as GmpSelectEvent;
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({ fields: ["formattedAddress", "location"] });
            console.log("[places] fetched", { formattedAddress: place.formattedAddress, location: place.location });
            if (!place.location || !place.formattedAddress) {
              setError("Lugar sin coordenadas. Selecciona otra opción.");
              return;
            }
            const loc = place.location;
            const lat = typeof loc.lat === "function" ? loc.lat() : (loc as unknown as { lat: number }).lat;
            const lng = typeof loc.lng === "function" ? loc.lng() : (loc as unknown as { lng: number }).lng;
            onSelectRef.current({
              formatted_address: place.formattedAddress,
              lat,
              lng,
            });
          } catch (e) {
            console.error("[places] error", e);
            setError((e as Error).message);
          }
        });

        containerRef.current.appendChild(element);
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
      if (element && element.parentNode) element.parentNode.removeChild(element);
    };
  }, [defaultValue]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div ref={containerRef} className="dk-place-autocomplete" />
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Importante: escribe y <strong>haz click en una de las opciones que aparecen abajo</strong> (no presiones Enter).
      </p>
      {error && (
        <p className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
      <style jsx global>{`
        gmp-place-autocomplete {
          display: block;
          width: 100%;
        }
        gmp-place-autocomplete input {
          width: 100%;
          height: 2.25rem;
          padding: 0 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid var(--color-border);
          background: transparent;
          color: inherit;
          font-size: 0.875rem;
          font-family: inherit;
        }
        gmp-place-autocomplete input:focus {
          outline: 2px solid var(--color-ring);
          outline-offset: 0;
        }
      `}</style>
    </div>
  );
}
