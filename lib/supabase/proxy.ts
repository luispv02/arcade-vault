import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
/**
 * Refresca la sesión de Supabase en cada petición (SPEC 11) y reescribe las
 * cookies en la respuesta. Solo hace comprobaciones optimistas leyendo los
 * claims del JWT: no consulta la base de datos.
 *
 * Redirecciones:
 *  - `/acceso` con sesión → `/games`.
 *  - `/acceso/perfil` sin sesión → `/acceso`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Sin variables de entorno no hay sesión que refrescar: las páginas que no
  // usan Supabase (home, about) deben seguir funcionando.
  if (!url || !key) return supabaseResponse;
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) =>
          supabaseResponse.headers.set(k, v),
        );
      },
    },
  });
  // No ejecutar código entre createServerClient y getClaims(): un descuido
  // aquí provoca cierres de sesión aleatorios.
  const { data } = await supabase.auth.getClaims();
  const hasSession = !!data?.claims;
  const { pathname } = request.nextUrl;
  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    const response = NextResponse.redirect(target);
    // Conserva las cookies (y cabeceras de caché) que haya fijado el refresco.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    supabaseResponse.headers.forEach((value, name) => {
      if (["cache-control", "expires", "pragma"].includes(name)) {
        response.headers.set(name, value);
      }
    });
    return response;
  };
  if (hasSession && pathname === "/acceso") return redirectTo("/games");
  if (!hasSession && pathname === "/acceso/perfil")
    return redirectTo("/acceso");
  return supabaseResponse;
}
