import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { ChefHat, LayoutDashboard } from "lucide-react";

export default async function CocinaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["admin", "cocina"]);
  const isAdmin = session.profile.rol === "admin";
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-40 border-b bg-[var(--color-background)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/cocina" className="flex items-center gap-2 text-lg font-semibold">
            <ChefHat className="h-5 w-5" /> Cocina · {session.profile.nombre}
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              </Button>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
