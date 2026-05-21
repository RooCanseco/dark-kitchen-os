import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy-client";

const PUBLIC_PATHS = ["/login", "/_next", "/favicon", "/manifest", "/sw.js", "/icons"];

const ROLE_HOMEPAGE: Record<string, string> = {
  admin: "/dashboard",
  cocina: "/cocina",
  repartidor: "/repartidor",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const { supabase, response } = createProxyClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Cargar rol del perfil
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("rol, activo")
    .eq("user_id", user.id)
    .single();

  if (!profile || !profile.activo) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "perfil_invalido");
    return NextResponse.redirect(url);
  }

  // Redirect a home si está en /
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOMEPAGE[profile.rol] ?? "/dashboard";
    return NextResponse.redirect(url);
  }

  // Restricción por rol
  const adminOnly = ["/dashboard", "/pedidos", "/clientes", "/menu", "/configuracion", "/cierre"];
  if (profile.rol !== "admin" && adminOnly.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOMEPAGE[profile.rol] ?? "/login";
    return NextResponse.redirect(url);
  }
  if (profile.rol !== "cocina" && profile.rol !== "admin" && pathname.startsWith("/cocina")) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOMEPAGE[profile.rol] ?? "/login";
    return NextResponse.redirect(url);
  }
  if (profile.rol !== "repartidor" && profile.rol !== "admin" && pathname.startsWith("/repartidor")) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOMEPAGE[profile.rol] ?? "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
