# SPEC 12 — Medidas de seguridad básicas

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 11
> **Fecha:** 2026-11-05
> **Objetivo:** Aplicar el checklist de seguridad básico de `references/security/secudiry-checklist.md`: verificar RLS en `games`, `scores` y `profiles`, endurecer los ajustes de Supabase Auth (contraseña mínima de 8, límite de signups por IP), validar con expresiones regulares el email y la contraseña en el formulario de acceso antes de llamar a Supabase y añadir cabeceras de seguridad HTTP en Next.js.

## Por qué existe esta spec

El checklist es corto, pero mezcla dos tipos de trabajo: cambios de código (`next.config.ts`) y ajustes manuales en el dashboard de Supabase, que ningún MCP puede aplicar. Esta spec los ordena, deja claro cuál es cada uno y fija cómo se verifica.

Estado de partida, comprobado con el MCP el 2026-11-05:

- RLS ya está activo en `public.games`, `public.scores` y `public.profiles` (SPEC 04 y SPEC 11).
- `get_advisors` (seguridad) solo avisa de `auth_leaked_password_protection` (WARN). Esa protección exige el plan Pro de Supabase y el proyecto está en **Free**, así que no se puede activar (ver Decisiones).
- `lib/auth.ts` ya exige 8 caracteres en el cliente (`PASSWORD_MIN`), pero el servidor de Auth no tiene por qué exigirlos: quien llame directamente a la API de Supabase se salta el formulario.
- La validación del cliente está incompleta: el email usa una regex laxa (`EMAIL_RE` acepta `a@b.c`) y el login (`validateSignIn`) solo exige que la contraseña no esté vacía, así que2 se envía a Supabase una contraseña que sabemos que no cumple el mínimo. `components/auth-form.tsx` ya usa `noValidate`, errores en línea (`aria-invalid`, `auth-<campo>-error`) y bloquea el envío si hay errores; esa mecánica se reutiliza.
- `next.config.ts` no define `headers`.

## Alcance

**Dentro:**

- **RLS:** comprobar con el MCP (`list_tables` y `execute_sql` de solo lectura sobre `pg_policies`) que las tres tablas tienen RLS y que las políticas coinciden con lo descrito en `CLAUDE.md` y la SPEC 11. Sin migración, salvo que se detecte una discrepancia (en ese caso se corrige con `apply_migration` y se anota en esta spec).
- **Contraseña mínima (manual, dashboard):** Authentication → Sign In / Providers → Email → "Minimum password length" = 8.
- **Límite de signups por IP (manual, dashboard):** Authentication → Rate Limits. Fijar el límite de registros e inicios de sesión por IP al valor restrictivo más cercano a 10 por hora que ofrezca el panel (ver Decisiones) y anotar el valor final en esta spec.
- **Cabeceras de seguridad** en `next.config.ts` (`headers()`, `source: "/(.*)"`):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Validación por regex en `lib/auth.ts` (puro)** de email y contraseña, aplicada en **registro y login**:
  - `EMAIL_RE` más estricta: parte local, `@`, dominio con punto y TLD de 2 o más letras.
  - `PASSWORD_RE = /^.{8,}$/`: 8 o más caracteres cualesquiera, sin reglas de composición.
  - `validateSignIn` y `validateSignUp` comparten las mismas reglas de email y contraseña; el envío a Supabase solo ocurre si no hay errores.
- **UI de `components/auth-form.tsx`:** mostrar bajo cada campo, en español y en línea, el mensaje de error de email o contraseña inválidos, sin llamar a Supabase. Mismos estilos de error existentes; sin scroll horizontal a 375 px (SPEC 10).
- **Leaked password protection:** documentar como riesgo aceptado por el plan Free; el aviso del advisor se queda.
- **Documentar** en `CLAUDE.md` una sección breve "Seguridad" (cabeceras, ajustes manuales de Auth, aviso aceptado).

**Fuera de alcance (para otras specs):**

- Content-Security-Policy: exige nonces con Next 16 y puede romper fuentes de Google, Supabase y OAuth.
- Restricciones adicionales en `scores` (rangos de `score`, límites de inserción por invitado) y antispam del Salón de la Fama.
- CAPTCHA (Turnstile/hCaptcha), SMTP propio y límites de envío de correo.
- Pasar a plan Pro para activar leaked password protection.
- Rate limiting propio en `POST /api/contact`.
- Pruebas automatizadas y escaneos de dependencias.

## Modelo de datos

Esta spec no introduce estructuras de datos nuevas ni migraciones. Solo añade configuración:

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];
// nextConfig.headers = async () => [{ source: "/(.*)", headers: securityHeaders }]
```

```ts
// lib/auth.ts (puro, sin React)
export const PASSWORD_MIN = 8; // ya existe
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/; // sustituye a la actual
export const PASSWORD_RE = /^.{8,}$/;
// validateSignIn({ email, password }) y validateSignUp(...) devuelven FieldErrors:
//   email:    "Escribe tu correo electrónico." | "El correo no es válido."
//   password: "Escribe tu contraseña." | "La contraseña debe tener al menos 8 caracteres."
```

Los ajustes de Auth no tienen representación en el repo: viven en el dashboard de Supabase y se registran solo en esta spec.

## Plan de implementación

1. **Auditoría de RLS.** Ejecutar `list_tables` y una consulta de solo lectura a `pg_policies` para `games`, `scores` y `profiles`. Comparar con la SPEC 11. Resultado: informe de conformidad; si hay discrepancia, migración correctiva.
2. **Cabeceras.** Añadir `securityHeaders` y `headers()` a `next.config.ts`, conservando `cacheComponents`, `partialPrefetching`, `turbopack` y `allowedDevOrigins`. Consultar antes en `node_modules/next/dist/docs/01-app/` la referencia de `headers` en `next.config`. Comprobar con `npm run dev` y `curl -I http://localhost:3000/` que aparecen las cinco, y que `/`, `/games`, `/acceso` y el juego siguen cargando (OAuth y fuentes incluidos).
3. **Ajustes de Auth (manual).** En el dashboard: contraseña mínima = 8 y límite de signups/inicios de sesión por IP. Anotar los valores definitivos en esta spec. Probar que un registro con contraseña de 7 caracteres contra la API de Auth (no el formulario) es rechazado.
4. **Validación por regex.** En `lib/auth.ts`, exportar `EMAIL_RE` (más estricta) y `PASSWORD_RE`, y hacer que `validateSignIn` y `validateSignUp` apliquen ambas (el registro hereda las reglas de `validateSignIn`; se elimina la comprobación suelta de `PASSWORD_MIN`). Comprobar a mano en `/acceso` que los mensajes salen en ambas pestañas.
5. **UI del formulario.** Revisar `components/auth-form.tsx` para que el login muestre el error de contraseña corta igual que el registro, que `submit` no llame a Supabase si `validate*` devuelve errores y que los mensajes se vean bien a 375 px. Si hace falta ajustar estilos de error, hacerlo en `app/globals.css` (diseño con `/frontend-design`).
6. **Aviso de contraseñas filtradas.** Ejecutar `get_advisors` y confirmar que el único aviso es `auth_leaked_password_protection`.
7. **Documentación.** Añadir la sección "Seguridad" a `CLAUDE.md` y pasar `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `list_tables` muestra `rls_enabled: true` en `games`, `scores` y `profiles`.
- [ ] Cada una de las tres tablas tiene al menos una política en `pg_policies`, y `scores` no admite `update` ni `delete` para `anon`/`authenticated`.
- [ ] `curl -I http://localhost:3000/` devuelve las cinco cabeceras con los valores de esta spec.
- [ ] Las cabeceras también aparecen en `/games`, `/acceso` y `/juegos/tetris/jugar`.
- [ ] La landing, `/games`, un juego, `/acceso` (incluido el login con Google/GitHub) y `POST /api/contact` funcionan sin errores nuevos en la consola del navegador.
- [ ] Un `signUp` directo contra la API de Auth con contraseña de 7 caracteres es rechazado por el servidor.
- [ ] El dashboard de Supabase muestra "Minimum password length" = 8 y el límite de signups por IP configurado; el valor queda anotado en esta spec.
- [ ] En `/acceso`, correos como `abc`, `a@b` o `a@b.c` muestran "El correo no es válido." en login y registro, y no se hace ninguna petición a Supabase (pestaña Red del navegador).
- [ ] En `/acceso`, una contraseña de 7 caracteres muestra "La contraseña debe tener al menos 8 caracteres." en login y en registro, y no se hace ninguna petición a Supabase.
- [ ] Campos vacíos muestran "Escribe tu correo electrónico." y "Escribe tu contraseña." sin petición a Supabase.
- [ ] Con email válido y contraseña de 8 o más caracteres, el formulario sí envía la petición a Supabase.
- [ ] Los campos con error tienen `aria-invalid` y los mensajes no producen scroll horizontal a 375 px.
- [ ] `get_advisors` (seguridad) devuelve solo `auth_leaked_password_protection`, documentado como riesgo aceptado.
- [ ] `CLAUDE.md` tiene la sección "Seguridad".
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** verificar RLS sin tocar el esquema (decisión del usuario). Ya está activo y probado en la SPEC 11. **No:** endurecer `scores` ahora; es una spec aparte si el spam se vuelve un problema.
- **Sí:** aceptar el aviso de leaked password protection por el plan Free (decisión del usuario). Mitigación parcial: contraseña mínima de 8 en cliente y servidor. **No:** subir a Pro solo por esto.
- **Sí:** las 3 cabeceras del checklist más `Strict-Transport-Security` y `Permissions-Policy` (decisión del usuario): no cambian el comportamiento de la app y son baratas. **No:** CSP, por el riesgo de romper la app y el coste de mantener nonces.
- **Sí:** `X-Frame-Options: DENY`; la app no se incrusta en iframes. Si algún día se necesitara, se revisa.
- **Sí:** HSTS sin `preload`: es un compromiso difícil de revertir y no está pedido.
- **Sí:** contraseña mínima de 8 y objetivo de 10 signups por hora por IP (decisión del usuario). **Nota:** el panel de Supabase puede expresar el límite como solicitudes de registro e inicio de sesión por IP en ventanas de 5 minutos, no por hora; se elige el valor más restrictivo equivalente que no bloquee a un usuario normal y se anota aquí. Esto es una adaptación del objetivo, no un cambio de decisión.
- **Sí:** regex de contraseña solo de longitud (`/^.{8,}$/`), sin exigir mayúscula, número o símbolo (decisión del usuario). Coincide con el mínimo del servidor y evita rechazar en cliente lo que Supabase aceptaría. **No:** reglas de composición, que añaden fricción y exigirían fijarlas también en Supabase.
- **Sí:** validar la contraseña también en el login (decisión del usuario): no se envía a Supabase algo que sabemos que no pasa. **No:** dejar el login solo con "no vacío". Coste: una cuenta antigua con contraseña de menos de 8 caracteres no podría entrar; hoy no existe ninguna creada con el formulario, que ya exigía 8.
- **Sí:** regex de email práctica con TLD de 2+ letras (decisión del usuario). **No:** la regex completa de RFC 5322, frágil y rechaza correos válidos; la verdad la sigue dando el correo de confirmación.
- **Sí:** la validación de cliente es solo comodidad y reducción de peticiones inútiles; el servidor (mínimo de 8 en el dashboard) sigue siendo la barrera real.
- **Sí:** los ajustes de Auth quedan como pasos manuales con criterio de verificación. **No:** gestionarlos con la Management API o infraestructura como código; sobredimensionado para un ajuste puntual.

## Riesgos identificados

| Riesgo                                                                                    | Mitigación                                                                                                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Las cabeceras rompen algún flujo (OAuth, fuentes, `next dev`)                             | Ninguna de las cinco restringe orígenes de recursos. Verificar OAuth, fuentes y juegos manualmente en el paso 2.          |
| `X-Frame-Options: DENY` interfiere con la vista previa de Claude Code/Playwright          | Esas herramientas abren la app como página, no en iframe; si hubiera problemas, se reevalúa solo en desarrollo.           |
| HSTS en `localhost` o redes sin HTTPS                                                     | Los navegadores ignoran HSTS sobre HTTP; solo aplica en producción con HTTPS (Vercel lo sirve).                           |
| Límite de signups demasiado bajo bloquea a usuarios tras una misma NAT                    | Valor moderado y ajustable desde el dashboard; revisar si hay quejas.                                                     |
| La regex de email rechaza algún correo válido poco común (p. ej. TLD de un solo carácter) | Aceptado: los TLD reales tienen 2 o más letras. Se prefiere simple a exhaustivo.                                          |
| Contraseñas filtradas siguen permitiéndose en Free                                        | Riesgo aceptado y documentado; revisar si el proyecto pasa a Pro.                                                         |
| Los ajustes manuales no quedan versionados y pueden revertirse sin aviso                  | Se anotan en esta spec y en `CLAUDE.md`; `get_advisors` y la verificación del paso 3 se repiten tras cambios de proyecto. |

## Lo que **no** está en esta spec

- Content-Security-Policy.
- Endurecer `scores` o añadir antispam al Salón de la Fama.
- CAPTCHA, SMTP propio y rate limiting de `POST /api/contact`.
- Activar leaked password protection (requiere plan Pro).
- Reglas de composición de contraseña (mayúsculas, números, símbolos) ni medidor de fortaleza.
- Cambios en el flujo de OAuth o en la validación del username.
- Cambios de esquema o políticas RLS, salvo corregir una discrepancia detectada en la auditoría.
- Pruebas automatizadas.

Cada uno de esos puntos, si se hace, va en su propia spec.
