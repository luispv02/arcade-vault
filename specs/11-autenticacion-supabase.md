# SPEC 11 — Autenticación real con Supabase Auth

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04, SPEC 06, SPEC 07, SPEC 10
> **Fecha:** 2026-11-05
> **Objetivo:** Reemplazar el login local de `localStorage` por autenticación real con Supabase Auth (registro y login con email + contraseña con confirmación por correo, Google y GitHub), con perfil de username único, sesión refrescada por `proxy.ts` y puntuaciones asociadas al usuario, manteniendo el modo invitado exactamente como hoy.

## Por qué existe esta spec

Hoy `/acceso` es una maqueta: `components/auth-form.tsx` guarda `{ name }` en `localStorage` (`av_user`, `lib/session.ts`) y cualquiera puede escribir cualquier nombre. La SPEC 04 dejó la conexión a Supabase lista (clientes `lib/supabase/client.ts` y `server.ts`, `@supabase/ssr` instalado) y reservó expresamente la autenticación y `proxy.ts` para una spec posterior. `auth.users` está vacío y `public.scores` admite inserciones públicas sin identidad (`scores_insert_public`, `with check (true)`).

Esta spec convierte la sesión en real sin romper a los consumidores actuales de `useSession()` (`nav.tsx`, `game-over-modal.tsx`, `hall-of-fame.tsx`, `asteroids-player.tsx`): la interfaz `user.name` se conserva, pero ahora `name` es el `username` del perfil. El invitado no cambia: sin cuenta, nombre editable en el modal de fin de partida y puntuación sin `user_id`.

En Next.js 16 `middleware` está deprecado y se llama `proxy` (`proxy.ts` en la raíz, runtime Node). Con `cacheComponents`, leer la sesión en servidor exige `<Suspense>`; por eso la sesión de la UI se lee en el cliente (ver Decisiones).

## Alcance

**Dentro:**

- **Migración** `supabase/migrations/<timestamp>_auth_profiles_scores_user_id.sql`, aplicada con el MCP y copiada al repo:
  - Tabla `profiles` con trigger `handle_new_user` sobre `auth.users`.
  - Columna `scores.user_id` y nueva política de inserción en `scores`.
  - `revoke execute` de `public.rls_auto_enable()` a `anon` y `authenticated` (aviso de seguridad detectado).
  - Regenerar `lib/supabase/database.types.ts`.
- **Registro** (pestaña "CREAR CUENTA"): username + email + contraseña. Al enviar, `signUp` con el username en `options.data`; como el correo se confirma, **no** se inicia sesión: se muestra un panel "REVISA TU CORREO". El enlace del correo pasa por `/auth/callback`.
- **Login** (pestaña "INICIAR SESIÓN"): solo email + contraseña (`signInWithPassword`). El username se muestra pero no sirve para entrar.
- **OAuth Google y GitHub:** los dos botones existentes pasan a `signInWithOAuth` con `redirectTo` a `/auth/callback`. Si el correo coincide con una cuenta existente, Supabase enlaza las identidades (mismo perfil).
- **Ruta `GET /auth/callback`** (`app/auth/callback/route.ts`): intercambia el `code` por sesión (`exchangeCodeForSession`) y redirige a `/games`, salvo que el perfil tenga `username_confirmed = false` (usuarios OAuth), que van a `/acceso/perfil`. Si falla, redirige a `/acceso?error=callback`.
- **Pantalla `/acceso/perfil`:** los usuarios OAuth eligen su username definitivo (el trigger les asigna uno provisional). Una vez confirmado, no se puede volver a editar.
- **`proxy.ts`** (raíz) con helper `lib/supabase/proxy.ts` (`updateSession`): refresca la sesión y reescribe las cookies en todas las rutas salvo estáticos. Redirige `/acceso` → `/games` si hay sesión y `/acceso/perfil` → `/acceso` si no la hay. Solo comprobaciones optimistas, sin consultar la base de datos.
- **`SessionProvider` real:** `user` sale de `supabase.auth` (`getSession` + `onAuthStateChange`) y del `username` en `profiles`. Se conserva `useSession()` con `user` (`name`, ahora también `id` y `email`), `logout` y `saveScore` (el de `av_scores`).
- **Menú de usuario en la barra** (`components/user-menu.tsx`, usado en `nav.tsx` escritorio y móvil): un icono que despliega una tarjeta con **Email**, **Usuario** y el botón **Cerrar sesión**. Solo lectura: el username no se edita desde aquí.
- **Puntuaciones:** con sesión, `GameOverModal` muestra el username fijo (no editable) y `saveScore` envía `user_id`. Sin sesión, igual que hoy (editable, `INVITADO` por defecto, sin `user_id`).
- **Validación y errores en español** en `lib/auth.ts` (puro): formato de username, email, contraseña y traducción de errores de Supabase.
- **UI** del formulario y del menú diseñada con `/frontend-design`, estética CRT/neón, apta para móvil según SPEC 10 (sin scroll horizontal a 375 px, objetivos táctiles cómodos).
- **Limpieza:** retirar `av_user` y sus funciones de `lib/session.ts` (se conserva `av_scores`); borrar la clave `av_user` huérfana de `localStorage` al montar el provider.
- **Documentar** en `CLAUDE.md` la nueva sesión, `proxy.ts`, `/auth/callback` y `profiles`.

**Fuera de alcance (para otras specs):**

- Cambiar el username después de registrarse o una página de perfil editable (el menú de usuario es solo lectura).
- "Olvidé mi contraseña", cambio de contraseña, cambio de email y reenvío del correo de confirmación.
- Iniciar sesión con el username, MFA, magic link, teléfono y otros proveedores OAuth.
- Subir avatar o más datos de perfil; estadísticas por usuario ("mis puntuaciones").
- Reservar usernames frente al invitado: un invitado puede escribir el username de un usuario registrado.
- Asociar a un usuario las puntuaciones antiguas (`user_id` nulo) o migrar sesiones `av_user`.
- Proteger rutas de juego: jugar y consultar el Salón siguen siendo públicos.
- Distintivo en el Salón de la Fama para puntuaciones con `user_id`; `hall-of-fame.tsx` sigue comparando por `name`.
- Personalizar plantillas de correo, SMTP propio, CAPTCHA y límites de tasa.
- Pruebas automatizadas.

## Modelo de datos

```sql
-- Perfil público de cada usuario autenticado (sin email: este vive solo en auth.users)
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text not null unique check (username ~ '^[A-Z0-9_]{3,10}$'),
  username_confirmed boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Puntuaciones: se añade el usuario autor (nulo para invitados y filas antiguas)
alter table public.scores
  add column user_id uuid references public.profiles (id) on delete set null;
```

Trigger `handle_new_user` (`security definer`, `set search_path = ''`, `execute` revocado a `anon`/`authenticated`) después de insertar en `auth.users`:

- **Registro con email:** toma `raw_user_meta_data->>'username'`, lo pasa a mayúsculas y lo inserta con `username_confirmed = true`. Si no cumple el formato o ya existe, lanza excepción y el registro falla.
- **OAuth:** no hay username en los metadatos. Genera uno provisional a partir de `user_name`, `preferred_username`, `full_name`, `name` o la parte local del email: mayúsculas, solo `[A-Z0-9_]`, 7 caracteres como máximo (`USR` si queda vacío). Si ya existe, añade 3 dígitos aleatorios y reintenta. Se inserta con `username_confirmed = false`.

Políticas RLS (se usa `(select auth.uid())` para que se evalúe una sola vez):

```sql
alter table public.profiles enable row level security;

-- Lectura pública (solo username; el email no está en profiles)
create policy profiles_select_public on public.profiles
  for select to anon, authenticated using (true);

-- El dueño solo puede editar su perfil mientras no haya confirmado el username
create policy profiles_update_own_unconfirmed on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and not username_confirmed)
  with check (id = (select auth.uid()));

-- Inserción de puntuaciones: invitado (user_id nulo) o autor autenticado con su propio username
drop policy scores_insert_public on public.scores;
create policy scores_insert on public.scores
  for insert to anon, authenticated
  with check (
    user_id is null
    or (
      user_id = (select auth.uid())
      and name = (select username from public.profiles where id = user_id)
    )
  );
```

Tipos y APIs de la app:

```ts
// lib/session.ts / components/session-provider.tsx
export interface SessionUser {
  id: string;
  name: string; // username del perfil (3–10, mayúsculas)
  email: string | null;
}
// useSession(): { user: SessionUser | null; logout: () => Promise<void>; saveScore: (...) => void }
// Se elimina `login`: el inicio de sesión lo hace Supabase y el provider reacciona a onAuthStateChange.

// lib/save-score.ts
saveScore(gameId: string, name: string, score: number, userId?: string | null): Promise<{ ok: boolean }>;

// lib/auth.ts (puro, sin React)
export const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;
export function validateSignUp(input: { username: string; email: string; password: string }): Record<string, string>;
export function authErrorMessage(error: { code?: string; message: string }): string; // en español
```

Convenciones:

- Username: se guarda y se muestra en mayúsculas; el formulario convierte lo que escribe el usuario.
- Contraseña: mínimo 8 caracteres, validado en el cliente (Supabase aplica además su propio mínimo).
- No se crean variables de entorno nuevas: el `redirectTo` se calcula con `window.location.origin`.

## Plan de implementación

1. **Requisitos manuales (sin código, a hacer antes de probar):** en el dashboard de Supabase (Authentication) comprobar que "Confirm email" está activo, fijar Site URL y añadir como Redirect URLs `http://localhost:3000/auth/callback` y la de producción. Para OAuth, crear la app en Google y en GitHub con la URL de callback que muestra Supabase y activar cada proveedor con su client ID y secret.
2. **Migración y tipos.** Aplicar la migración con `apply_migration` (tabla `profiles`, trigger, `scores.user_id`, RLS, revocar `rls_auto_enable`), copiarla a `supabase/migrations/` y regenerar `lib/supabase/database.types.ts`. Comprobar con `get_advisors` y que el guardado de puntuaciones de invitado sigue funcionando.
3. **Proxy.** Crear `lib/supabase/proxy.ts` (`updateSession`) y `proxy.ts` con su `matcher`. Consultar antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` y la guía de Supabase SSR vigente (MCP `search_docs`) para elegir `getClaims()` o `getUser()`. Resultado: la app funciona igual y las cookies de sesión se refrescan.
4. **Ruta `/auth/callback`.** Route Handler que intercambia el `code`, lee `username_confirmed` del perfil y redirige a `/games` o `/acceso/perfil`; en error, a `/acceso?error=callback`.
5. **Validación y sesión real.** Crear `lib/auth.ts`. Reescribir `SessionProvider` (Supabase + `profiles`, borrado de `av_user`) y quitar `av_user` de `lib/session.ts`. Mientras no haya login funcional, el sitio funciona como invitado.
6. **Formulario de acceso.** Adaptar `components/auth-form.tsx` manteniendo el aspecto: pestañas con login y registro por email, errores en línea en español, estado de envío y panel "REVISA TU CORREO". "JUGAR COMO INVITADO" cierra cualquier sesión activa y va a `/games`. Los botones de Google y GitHub siguen como maqueta hasta el paso 8.
7. **Menú de usuario y cierre de sesión.** Crear `components/user-menu.tsx` (Email, Usuario, Cerrar sesión) y usarlo en `nav.tsx` en escritorio y móvil. `logout` llama a `supabase.auth.signOut()`.
8. **OAuth y perfil.** Conectar los botones a `signInWithOAuth`. Crear `app/acceso/perfil/page.tsx` y el formulario para elegir el username definitivo (`update` en `profiles` con `username_confirmed = true`).
9. **Puntuaciones con usuario.** `lib/save-score.ts` recibe `userId`; `GameOverModal` muestra el username fijo si hay sesión y pasa `user.id`. Los players no cambian.
10. **Estilos y documentación.** Clases de la pantalla de acceso, menú de usuario y perfil en `app/globals.css`. Actualizar `CLAUDE.md` (Sesión, Datos, rutas, `proxy.ts`). Ejecutar `get_advisors` y `npm run lint`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Existen `public.profiles`, `scores.user_id` y la migración está en `supabase/migrations/`; `get_advisors` ya no avisa de `rls_auto_enable` ejecutable por `anon`/`authenticated`.
- [ ] Registrarse con username, email y contraseña válidos muestra "REVISA TU CORREO" y no inicia sesión; el enlace del correo abre `/auth/callback` y deja al usuario dentro, en `/games`.
- [ ] Registrarse con un username ya existente, con formato inválido (fuera de `[A-Z0-9_]{3,10}`) o con contraseña de menos de 8 caracteres muestra un error en español en el formulario y no crea el usuario.
- [ ] Iniciar sesión con email y contraseña correctos lleva a `/games`; con credenciales erróneas o correo sin confirmar muestra un error en español distinto para cada caso.
- [ ] Iniciar sesión con Google y con GitHub funciona; la primera vez lleva a `/acceso/perfil`, y tras elegir el username definitivo, a `/games`. Las siguientes veces entra directo a `/games`.
- [ ] En `/acceso/perfil` un username ya tomado o inválido se rechaza; un usuario con `username_confirmed = true` no puede volver a modificarlo (la actualización falla por RLS).
- [ ] Entrar con Google/GitHub con el mismo correo de una cuenta existente usa el mismo perfil (un solo `profiles.id`).
- [ ] Con sesión iniciada, `/acceso` redirige a `/games`; sin sesión, `/acceso/perfil` redirige a `/acceso`.
- [ ] Recargar la página con sesión iniciada mantiene al usuario en la barra, y las cookies de sesión se refrescan sin intervención.
- [ ] El icono de usuario en la barra (escritorio y móvil) muestra Email y Usuario correctos y un botón "Cerrar sesión" que cierra la sesión y devuelve la barra al estado de invitado.
- [ ] Con sesión, al terminar una partida el modal muestra el username sin permitir editarlo, y la fila nueva en `scores` tiene `user_id` y `name` iguales al usuario y al username.
- [ ] Sin sesión, el modal sigue mostrando `INVITADO` editable y la fila nueva en `scores` tiene `user_id` nulo.
- [ ] Insertar en `scores` con `user_id` de otro usuario, o con `name` distinto al username del propio usuario, es rechazado por RLS.
- [ ] "JUGAR COMO INVITADO" cierra cualquier sesión activa y lleva a `/games`.
- [ ] `localStorage` ya no guarda `av_user` y la clave huérfana se elimina al cargar la app.
- [ ] A 375 px de ancho `/acceso`, `/acceso/perfil` y el menú de usuario no tienen scroll horizontal.
- [ ] La consola del navegador no muestra errores de hidratación en `/`, `/games` y `/acceso`.
- [ ] `CLAUDE.md` describe la sesión real, `proxy.ts`, `/auth/callback` y `profiles`.

## Decisiones tomadas y descartadas

- **Sí:** una sola spec que cubre email, Google y GitHub (decisión del usuario). **No:** dividirla en dos; se asume un plan más largo a cambio de entregar toda la autenticación a la vez.
- **Sí:** confirmación de correo para el registro con email (decisión del usuario). Por eso el registro no inicia sesión y existe el panel "REVISA TU CORREO". **No:** desactivarla en desarrollo.
- **Sí:** login solo con email + contraseña. **No:** login con username, que exigiría una función para resolver username → email y expondría qué usernames existen.
- **Sí:** el invitado queda igual que hoy. **No:** reservar usernames de usuarios registrados frente al invitado (decisión del usuario).
- **Sí:** username independiente del email, único, 3–10 caracteres `[A-Z0-9_]`, mayúsculas. El mínimo de 3 (los nombres de invitado siguen aceptando 1–10) evita usernames triviales.
- **Sí:** el username no se puede editar tras registrarse. El usuario ve su Email y Usuario en un menú de solo lectura con la opción de cerrar sesión (decisión del usuario). **No:** pantalla de perfil editable, que obligaría a decidir qué pasa con `scores.name` ya guardado.
- **Sí:** usuarios OAuth con username provisional que confirman en `/acceso/perfil`, con la columna `username_confirmed`. **No:** pedir el username antes de salir hacia el proveedor, porque OAuth no admite datos propios en ese paso.
- **Sí:** enlazar identidades si el correo coincide (decisión del usuario): una persona, un perfil. **No:** rechazar con mensaje.
- **Sí:** redirigir siempre a `/games` tras entrar o confirmar (decisión del usuario). **No:** parámetro `?next=`, que añade validación de rutas.
- **Sí:** sesión de la UI leída en el cliente (`SessionProvider` con `onAuthStateChange`). Con `cacheComponents`, leer `cookies()` en el layout obligaría a envolver `Nav` en `<Suspense>` y a rehacer `useSession()` en todos los consumidores. **No:** `getUser()` en el layout. Coste asumido: en el primer render la barra muestra el estado de invitado, como ocurre hoy con `localStorage`.
- **Sí:** `proxy.ts` solo refresca sesión y hace redirecciones optimistas, como indica la guía de Next 16. **No:** consultar la base de datos ni proteger rutas de juego en el proxy.
- **Sí:** la RLS de `scores` exige que, si hay `user_id`, el `name` sea el username del autor. Evita que un usuario autenticado firme puntuaciones con un nombre ajeno. **No:** exigir sesión para guardar, porque rompería el invitado.
- **Sí:** `profiles` sin email y con lectura pública. El email se muestra solo al propio usuario, leyéndolo de su sesión.
- **Sí:** `on delete set null` en `scores.user_id`: si un usuario se elimina, sus puntuaciones permanecen en el ranking.

## Riesgos identificados

| Riesgo                                                                                                   | Mitigación                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un usuario autenticado inserta `scores` con `user_id` nulo y un nombre arbitrario (equivale al invitado) | Es el comportamiento aceptado del invitado. La suplantación entre usuarios registrados y el invitado queda fuera de alcance (ver Alcance).                                            |
| Carrera entre la comprobación de disponibilidad del username y el `insert` del trigger                   | La restricción `unique` y el trigger son la fuente de verdad; el cliente traduce el fallo a "No se pudo crear la cuenta. Prueba otro usuario".                                        |
| El trigger falla y deja el registro bloqueado (`Database error saving new user`)                         | Probar el trigger con registro por email y por OAuth antes de dar el paso 2 por bueno; mensaje genérico en español en `authErrorMessage`.                                             |
| Revocar `EXECUTE` de `rls_auto_enable()` rompe la activación automática de RLS                           | Es una función propia del proyecto invocada por el propietario; comprobar tras la migración que una tabla nueva sigue con RLS y repetir `get_advisors`.                               |
| El límite del SMTP por defecto de Supabase limita los correos de confirmación                            | Aceptado para desarrollo; SMTP propio queda fuera de alcance. Documentarlo en el panel "REVISA TU CORREO" no es necesario, basta con el error `over_email_send_rate_limit` traducido. |
| Parpadeo "invitado → usuario" al cargar                                                                  | Asumido por la decisión de leer la sesión en el cliente; el provider usa `useSyncExternalStore`/estado inicial `null` para evitar errores de hidratación.                             |
| `proxy.ts` rompe recursos estáticos o rutas de API                                                       | `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes; verificar `POST /api/contact` tras añadirlo.                                                           |
| OAuth sin configurar en el dashboard devuelve un error confuso                                           | Paso 1 manual y obligatorio; el botón muestra un mensaje en español si `signInWithOAuth` falla.                                                                                       |
| `hall-of-fame.tsx` marca como "mía" una fila de un invitado con el mismo nombre                          | Aceptado; el distintivo por `user_id` queda para otra spec.                                                                                                                           |

## Lo que **no** está en esta spec

- Editar username, contraseña o email; recuperar contraseña; reenviar el correo de confirmación.
- Login con username, MFA, magic link y más proveedores.
- Reservar usernames frente al invitado y asociar puntuaciones antiguas a un usuario.
- Perfil con avatar o estadísticas, y distintivo de usuario en el Salón de la Fama.
- Rutas protegidas, roles y permisos.
- SMTP propio, plantillas de correo y CAPTCHA.
- Pruebas automatizadas.

Cada uno de esos puntos, si se hace, va en su propia spec.
