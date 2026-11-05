import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
/**
 * Cliente de Supabase para el servidor (Route Handlers, Server Functions y
 * Server Components). Crea una instancia nueva por petición: nunca lo guardes
 * en una variable global.
 *
 * Con `cacheComponents`, `cookies()` es un dato de runtime: llama a esta función
 * solo dentro de un límite <Suspense> o en Route Handlers, nunca en un
 * `use cache` simple.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) {
    throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!key) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  // Con sesión, supabase-js comprueba la caducidad del token con Date.now(): con
  // cacheComponents eso rompe el prerender. Esta espera lo deja para la petición.
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Se llamó desde un Server Component, donde no se pueden escribir
          // cookies. Es seguro ignorarlo: el refresco de sesión lo hace
          // proxy.ts (SPEC 11).
        }
      },
    },
  });
}
