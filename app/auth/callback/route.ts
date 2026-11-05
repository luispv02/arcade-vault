import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Destino de los enlaces de confirmación de correo y del retorno de Google/GitHub
// (SPEC 11). Intercambia el `code` (PKCE) por la sesión y redirige:
//  - `/acceso/perfil` si el username aún es provisional (usuarios OAuth),
//  - `/games` en cualquier otro caso,
//  - `/acceso?error=callback` si algo falla.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Detrás de un proxy/CDN el origen público llega en x-forwarded-host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV !== "development" && forwardedHost
      ? `https://${forwardedHost}`
      : origin;
  const fail = () => NextResponse.redirect(`${base}/acceso?error=callback`);
  // Error devuelto por el proveedor (p. ej. el usuario canceló) o enlace sin code.
  if (!code || searchParams.get("error")) return fail();
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username_confirmed")
      .eq("id", userId)
      .maybeSingle();
    if (profile && !profile.username_confirmed) {
      return NextResponse.redirect(`${base}/acceso/perfil`);
    }
  }
  return NextResponse.redirect(`${base}/games`);
}
