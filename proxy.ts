import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
// Refresca la sesión de Supabase en cada petición (SPEC 11).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}
export const config = {
  matcher: [
    // Todas las rutas salvo estáticos de Next, favicon y assets de public/.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)",
  ],
};
