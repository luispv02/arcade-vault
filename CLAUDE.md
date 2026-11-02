# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos (según el README). Sigue desarrollo guiado por especificaciones (Spec Driven Design), usando las skills `/spec` y `/spec-impl` de https://github.com/Klerith/fernando-skills (se instalan con `npx skills@latest add Klerith/fernando-skills`). Actualmente es todavía el scaffold sin modificar de Create Next App (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`).

## Advertencia sobre la versión de Next.js

Next.js 16.4.4 con React 19.3: más reciente que los datos de entrenamiento habituales, con cambios incompatibles. Según `AGENTS.md`, lee la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) antes de escribir código de Next.js, y respeta los avisos de deprecación. `AGENTS.md` es regenerado por `next dev`.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Notas de arquitectura

- Solo App Router (`app/`), TypeScript en modo estricto, alias de ruta `@/*` → raíz del repo.
- `next.config.ts` habilita `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`. `cacheComponents` cambia la semántica de caché y renderizado (el acceso a datos dinámicos debe manejarse explícitamente, p. ej. con Suspense o directivas de caché), así que consulta la documentación antes de obtener datos o usar APIs de request en páginas/layouts.
- Tailwind CSS v4 está conectado mediante Turbopack: `next.config.ts` tiene una entrada `turbopack.rules` que ejecuta `@tailwindcss/turbopack` sobre `*.css`. Los estilos se configuran en CSS (`@import "tailwindcss"` y `@theme inline` en `app/globals.css`), no en un archivo `tailwind.config`. Los colores del tema son variables CSS con override para `prefers-color-scheme` oscuro.
- El layout raíz usa el helper de tipo global `LayoutProps<"/">` (generado por el typegen de Next; no requiere import) y carga las fuentes Geist con `next/font/google`.
