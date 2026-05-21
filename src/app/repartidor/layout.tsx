import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { SWRegister } from "@/components/sw-register";
import { Bike } from "lucide-react";

export default async function RepartidorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["admin", "repartidor"]);
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <SWRegister />
      <header className="sticky top-0 z-40 border-b bg-[var(--color-background)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/repartidor" className="flex items-center gap-2 font-semibold">
            <Bike className="h-5 w-5" /> {session.profile.nombre}
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>
    </div>
  );
}
