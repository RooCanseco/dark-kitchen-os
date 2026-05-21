import { requireRole } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin");
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-muted)]/20">
      <AdminNav nombre={session.profile.nombre} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
