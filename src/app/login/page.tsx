import { LoginForm } from "./login-form";
import { ChefHat } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-muted)]/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
            <ChefHat className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Dark Kitchen OS</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Inicia sesión para continuar</p>
        </div>
        <LoginForm initialError={error} />
      </div>
    </div>
  );
}
