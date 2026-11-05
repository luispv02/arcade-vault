# Decisiones previas para la spec de autenticación

Insumo para `/spec` (no es una spec). Fecha: 2026-11-05.

## Estado actual (verificado)

- `auth.users` vacío; Supabase Auth activo pero sin uso.
- No existe `proxy.ts` ni `middleware.ts`. `lib/supabase/server.ts` ya espera un `proxy.ts` para refrescar sesión.
- `components/auth-form.tsx` ya tiene pestañas Iniciar sesión / Crear cuenta, botones Google y GitHub e "Invitado", pero es maqueta: guarda `{ name }` en `localStorage` (`av_user`) vía `lib/session.ts`.
- Consumidores de `useSession()`: `nav.tsx`, `game-over-modal.tsx`, `hall-of-fame.tsx`, `asteroids-player.tsx`.
- `public.scores` (13 filas, todas con `name` no vacío): inserción pública sin identidad. Revisar columnas y políticas antes de redactar la spec.
- Aviso de seguridad: `public.rls_auto_enable()` es `SECURITY DEFINER` y la ejecutan `anon` y `authenticated`; revocar `EXECUTE` en la misma migración.

## Next.js 16

- `middleware` está deprecado: se llama `proxy.ts` (raíz), `export function proxy(request)`, runtime Node.
- `proxy` solo hace comprobaciones optimistas (cookie, sin consultar BD); las comprobaciones reales van en una capa de acceso a datos.
- Con `cacheComponents`, leer la sesión (`cookies()`) va dentro de `<Suspense>`.
- Guías: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` y `authentication-with-cache-components.md`.

## Decisiones cerradas

- **Métodos:** email + contraseña, Google y GitHub, los tres operativos.
- **Username:** independiente del email, único, 1–10 caracteres, mayúsculas. Tabla `profiles` (`id` → `auth.users`) creada por trigger. Para OAuth, el trigger genera uno provisional (saneado, con sufijo si ya existe) y la pantalla `/acceso/perfil` deja elegir el definitivo la primera vez (campo tipo `username_confirmed`).
- **Invitado: NO cambia.** Sin cuenta, nombre editable en el modal de fin de partida (por defecto `INVITADO`), puntuación guardada sin `user_id`. "JUGAR COMO INVITADO" cierra cualquier sesión activa y va a `/games`.
- **Sesión en cliente:** `SessionProvider` se alimenta de `supabase.auth.onAuthStateChange`; se mantiene la interfaz `useSession()` (`user.name`) para no tocar a los consumidores. Se retira `av_user` de `localStorage`.
- **Proxy:** `proxy.ts` refresca la sesión en todas las rutas; solo redirige `/acceso` → `/games` si ya hay sesión.
- **Puntuaciones:** `scores.user_id` nullable (FK a `profiles`). RLS: el insert exige `user_id` null o igual a `auth.uid()`.
- **RLS `profiles`:** lectura pública; update solo del dueño.
- **UI:** `AuthForm` existente, español, estética CRT, errores y estados de carga, cerrar sesión, apta para móvil (SPEC 10). Diseño con `/frontend-design`.

## OAuth: requisitos

- Ruta `GET /auth/callback` (Route Handler): `exchangeCodeForSession(code)` y redirección con parámetro `next`.
- **Paso manual previo a probar:** crear la app OAuth en Google y en GitHub, activar ambos proveedores en el dashboard de Supabase (client ID y secret) y añadir como redirección `http://localhost:3000/auth/callback` y la URL de producción.
- A decidir en la spec: qué hacer si un email ya registrado entra con otro proveedor (enlazar identidades o rechazar con mensaje claro).
- A decidir en la spec: confirmación de email (propuesta: desactivada en desarrollo).

## Comando para `/spec`

```
/spec Autenticación real con Supabase Auth: registro, login y cierre de sesión con email+contraseña, Google y GitHub (OAuth con ruta /auth/callback). Perfiles con username único independiente del email (provisional para OAuth y pantalla para elegirlo). Sesión refrescada con proxy.ts y SessionProvider alimentado por onAuthStateChange manteniendo la interfaz useSession(). El modo invitado NO cambia: sin cuenta, nombre editable en el modal de fin de partida, puntuación guardada sin user_id. Los usuarios autenticados guardan con user_id y su username (scores.user_id nullable, con RLS). Reemplaza el login local de localStorage. UI en AuthForm existente, español, estética CRT y apta para móvil (SPEC 10)
```
