import Link from "next/link";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        <h2 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Configuración
        </h2>
        <ConfigLink href="/configuracion/tarifas">Tarifas de envío</ConfigLink>
        <ConfigLink href="/configuracion/tags">Tags de excepción</ConfigLink>
        <ConfigLink href="/configuracion/usuarios">Usuarios</ConfigLink>
      </aside>
      <section>{children}</section>
    </div>
  );
}

function ConfigLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
    >
      {children}
    </Link>
  );
}
