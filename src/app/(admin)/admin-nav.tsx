"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChefHat, LayoutDashboard, ShoppingBag, Users, UtensilsCrossed,
  Settings, FileBarChart, LogOut, Menu as MenuIcon, X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Operación del día", icon: LayoutDashboard },
  { href: "/pedidos/nuevo", label: "Nuevo pedido", icon: ShoppingBag, accent: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/menu", label: "Menú diario", icon: UtensilsCrossed },
  { href: "/configuracion/tarifas", label: "Configuración", icon: Settings },
  { href: "/cierre", label: "Cierre de caja", icon: FileBarChart },
];

export function AdminNav({ nombre }: { nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--color-background)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
            <ChefHat className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Dark Kitchen</span>
        </Link>
        <nav className="ml-6 hidden flex-1 items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon, accent }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href.split("/").slice(0, 2).join("/")));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]/50 hover:text-[var(--color-foreground)]",
                  accent && !active && "text-[var(--color-foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-[var(--color-muted-foreground)] md:inline">{nombre}</span>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-[var(--color-background)] p-2 md:hidden">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--color-secondary)]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
