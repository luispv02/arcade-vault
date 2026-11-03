# SPEC 04 — Conexión de Supabase con la app Next.js

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 03
> **Fecha:** 2026-11-03
> **Objetivo:** Conectar la app Next.js al proyecto Supabase `exfpljdgpggffqysgyls` con clientes de navegador y servidor y las variables de entorno, sin crear ni modificar nada en la base de datos ni añadir endpoints.

## Por qué existe esta spec

Hoy la sesión y las puntuaciones viven en `localStorage` (`lib/session.ts`) y los rankings son mock (`lib/scores.ts`). Antes de reemplazarlos hace falta una conexión configurada con Supabase. Esta spec deja solo esa conexión: no cambia ninguna pantalla, no añade rutas ni API y **no escribe nada en el proyecto de Supabase**.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Clientes en `lib/supabase/`: uno para componentes cliente (`client.ts`) y uno para servidor (`server.ts`, con `cookies()` de `next/headers`).
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.template` y definidas en `.env.local`.
- Obtener la URL y la publishable key del proyecto con el MCP de Supabase (solo lectura: `get_project_url` y `get_publishable_keys`).

**Fuera de alcance (para otras specs):**

- **Cualquier cambio en la base de datos:** tablas, migraciones, políticas RLS, funciones, triggers, extensiones, datos. Tampoco la carpeta `supabase/migrations/`.
- **Cualquier API o Route Handler**, incluido un endpoint de health check.
- Tipos TypeScript generados de la base de datos (no hay esquema que tipar).
- Autenticación: email + contraseña, OAuth, reemplazo del login mock de `/acceso` y de `session-provider.tsx`.
- `proxy.ts` para refrescar la sesión con cookies.
- Tablas `games`, `scores` y `profiles`, y el Salón de la Fama real.
- Realtime y Edge Functions.
- Clave `service_role` y cualquier operación privilegiada.
- Supabase local con Docker y ramas de base de datos (branching).
- Pruebas automatizadas.

## Modelo de datos

Esta feature no introduce estructuras de datos ni cambios en la base de datos. Solo añade dos funciones de fábrica y dos variables de entorno.

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient; // createBrowserClient

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // createServerClient + cookies()
```

```bash
# .env.local (no versionado) y .env.template (sin valores)
NEXT_PUBLIC_SUPABASE_URL=https://exfpljdgpggffqysgyls.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Convenciones:

- Los clientes no usan genéricos de `Database`, porque aún no hay esquema.
- El cliente de servidor crea una instancia nueva por petición (nunca un singleton global). El de navegador puede reutilizarse.
- Los clientes leen las dos variables y lanzan un error claro si alguna falta.
- No se toca `lib/session.ts`, `lib/scores.ts` ni `components/session-provider.tsx`, y ningún componente importa todavía los clientes.

## Plan de implementación

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install`). `npm run dev` arranca sin errores.
2. Con el MCP de Supabase (solo lectura) obtener la URL y la publishable key; añadirlas a `.env.local` y listar los nombres, sin valores, en `.env.template`.
3. Consultar las guías de `node_modules/next/dist/docs/` sobre `cookies()` y `cacheComponents`. Crear `lib/supabase/client.ts` con `createBrowserClient`. `npm run lint` pasa.
4. Crear `lib/supabase/server.ts` con `createServerClient` y `cookies()`. `npm run lint` pasa.
5. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Ningún paso ejecuta SQL ni usa herramientas del MCP que escriban en el proyecto (`apply_migration`, `execute_sql`, `create_branch`, `deploy_edge_function` y similares).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `.env.template` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores; `.env.local` los define y sigue ignorado por git.
- [ ] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y exportan `createClient`.
- [ ] Ambos clientes lanzan un error explícito si falta alguna de las dos variables de entorno.
- [ ] La URL de `.env.local` coincide con la que devuelve `get_project_url` del MCP.
- [ ] No existe ninguna ruta nueva bajo `app/` (en particular, ningún `app/api/health`).
- [ ] `list_tables` y `list_migrations` del MCP siguen mostrando el proyecto sin tablas ni migraciones nuevas (la base de datos no cambió).
- [ ] No existe la carpeta `supabase/` ni archivos `.sql` añadidos por esta spec.
- [ ] Ninguna clave `service_role` aparece en el código, en `.env.template` ni en el repositorio.
- [ ] `/acceso`, `/games` y el resto de pantallas se comportan igual que antes (sesión mock en `localStorage`).

## Decisiones

- **Sí:** solo la conexión de Supabase con el proyecto (decidido). Cero cambios en la base de datos.
- **No:** endpoint `GET /api/health` ni ninguna otra API (decidido por el usuario). Se retiró de la versión anterior.
- **No:** tabla `profiles`, trigger, RLS y migraciones (decidido por el usuario); irán en la spec de auth o de datos.
- **No:** tipos generados de la base de datos. Sin esquema no hay nada que tipar; se generan con la primera spec que cree tablas.
- **No:** autenticación ni `proxy.ts` (decidido). Email + contraseña y OAuth van en otra spec.
- **Sí:** publishable key (`sb_publishable_...`) y sin `service_role` (decidido). Ningún secreto privilegiado en la app.
- **Sí:** `@supabase/ssr` con clientes separados de navegador y servidor. Es el patrón oficial para App Router y servirá para la auth con cookies.
- **Sí:** verificar con lint, build y comparación de la URL con el MCP, sin endpoint ni consultas. Decisión mía derivada de no crear API ni tablas; la prueba de conexión real llegará con la primera spec que use los clientes.
- **No:** realtime, Edge Functions, Supabase local ni branching. Quedan para specs futuras.

## Riesgos

| Riesgo                                                                           | Mitigación                                                                                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| La conexión no se prueba en ejecución (no hay endpoint ni consulta)              | Aceptado; los clientes validan las variables y la URL se contrasta con el MCP. La primera spec que consulte datos la ejercitará. |
| Ejecutar por error una herramienta del MCP que modifique el proyecto             | El plan lo prohíbe; el criterio de aceptación comprueba que no hay tablas ni migraciones nuevas.                                 |
| Filtrar claves sensibles al repositorio                                          | Solo se usa la publishable key; `.env.local` ignorado por git; `.env.template` sin valores.                                      |
| `cacheComponents` y `cookies()` en rutas o componentes de servidor               | Consultar las guías de Next 16; `server.ts` solo se usará dentro de Route Handlers o bajo Suspense.                              |
| `.env` y `.env.template` ya mezclan variables de Resend y `SUPABASE_DB_PASSWORD` | No se modifican las existentes; solo se añaden las dos nuevas.                                                                   |

## Lo que **no** está en esta spec

- Cualquier cambio en la base de datos (tablas, migraciones, RLS, funciones, triggers, datos).
- Cualquier API o Route Handler, incluido `/api/health`.
- Tipos generados de la base de datos.
- Autenticación (email + contraseña, OAuth) y cambios en `/acceso`.
- `proxy.ts` y refresco de sesión.
- Realtime y Edge Functions.
- Clave `service_role`.
- Supabase local (Docker) y branching.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
