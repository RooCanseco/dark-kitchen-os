"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { reordenarRuta } from "./actions";

export function ReordenarBtn({
  pedido_id,
  direction,
  disabled,
}: {
  pedido_id: string;
  direction: "up" | "down";
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        await reordenarRuta(pedido_id, direction);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-6 w-6"
      onClick={onClick}
      disabled={disabled || pending}
      aria-label={direction === "up" ? "Subir" : "Bajar"}
    >
      {direction === "up" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </Button>
  );
}
