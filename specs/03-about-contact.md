# SPEC 03 — Página Acerca de y formulario de contacto con Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-11-02
> **Objetivo:** Portar a Next.js la pantalla About del template `references/templates/home-about/about.jsx` en `/about`, haciendo que su formulario de contacto envíe un correo real mediante Resend a través de `POST /api/contact`.

## Por qué existe esta spec

La SPEC 02 dejó fuera de alcance la pantalla Acerca de y su formulario (el template original solo simula el envío con un estado local). Esta spec la añade y sustituye la simulación por un envío real de correo, manteniendo exactamente el aspecto y el copy del template.

## Alcance

**Dentro:**

- Pantalla **Acerca de** en `/about` con las secciones del template:
  - Hero: kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 destacados con icono pixel (`HEART`, `BROWSER`, `PLANT`) y retraso escalonado de 80 ms.
  - Divisor decorativo (`about-divider`) con 24 píxeles animados.
  - Sección de contacto: kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo, 3 avisos (`tip`) y formulario (NOMBRE, CORREO ELECTRÓNICO, MENSAJE, botón "▶  ENVIAR MENSAJE").
  - Estado de éxito estilo terminal "VAULT-OS // TERMINAL" con el nombre en mayúsculas y botón "ENVIAR OTRO MENSAJE".
  - Animación `shake` del formulario cuando falta algún campo.
- Textos, clases y estructura copiados tal cual de `about.jsx`.
- **Route Handler** `POST /api/contact` que valida el cuerpo en el servidor y envía el correo con Resend.
- Estados que el template no define: **enviando** (botón deshabilitado con texto "ENVIANDO…") y **error** (línea `[ERROR]` en estilo terminal con el formulario conservado para reintentar).
- Enlace **"Sobre nosotros"** (`/about`) en la nav de escritorio y en el menú móvil, activo en `/about`.
- Portar a `app/globals.css` las clases CSS de About que falten (`.about-*`, `.highlight*`, `.hl-*`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, `.shake`, etc.).
- Variables de entorno `RESEND_API_KEY` y `CONTACT_TO_EMAIL`, documentadas en `.env.example`.
- Interfaz diseñada con la skill `/frontend-design`, respetando el look del template.

**Fuera de alcance (para otras specs):**

- Dominio propio verificado en Resend (se usa `onboarding@resend.dev`).
- Rate limiting, honeypot, CAPTCHA o cualquier otra protección anti-spam.
- Correo de confirmación al remitente del formulario.
- Guardar los mensajes en base de datos.
- Cambiar el enlace del footer o añadir otros enlaces a `/about` fuera de la nav.
- Pruebas automatizadas.
- Internacionalización: todos los textos en español.

## Modelo de datos

```ts
// lib/contact.ts  (compartido por el formulario y el Route Handler)
export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export interface ContactPayload { name: string; email: string; msg: string }

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: string };           // mensaje legible para mostrar en pantalla

export function validateContact(input: unknown):
  | { ok: true; data: ContactPayload }
  | { ok: false; error: string };
```

Convenciones:

- `validateContact` recorta (`trim`) los tres campos, exige que no estén vacíos, aplica `CONTACT_LIMITS` y comprueba un formato básico de correo.
- Respuestas del Route Handler: `200 { ok: true }`, `400 { ok: false, error }` si la validación falla, `500 { ok: false, error }` si Resend falla o falta configuración. Nunca se devuelve el detalle interno de Resend ni la API key.
- El correo se envía con `from: "Arcade Vault <onboarding@resend.dev>"`, `to: process.env.CONTACT_TO_EMAIL`, `replyTo` = correo del remitente y `subject` = `Contacto Arcade Vault — {nombre}`. El cuerpo es texto plano con nombre, correo y mensaje.
- `.env.local` define `CONTACT_TO_EMAIL=luispv.1002@gmail.com` y `RESEND_API_KEY`; `.env.example` lista ambas sin valores secretos. `.env.local` no se versiona.
- Con `onboarding@resend.dev` Resend solo entrega al correo dueño de la cuenta; por eso el destinatario debe ser ese.
- No hay persistencia ni estado de servidor nuevos.

## Plan de implementación

1. Instalar `resend` (`npm install resend`) y crear `.env.example`; comprobar que `.gitignore` excluye `.env.local`. `npm run dev` arranca sin errores.
2. Auditar qué clases de About faltan en `app/globals.css` frente a `references/templates/home-about/styles.css` (desde `.about`) y portarlas, incluidos `@keyframes` de `shake`, píxeles del divisor y caret. Comprobar que `.kicker`, `.pixel`, `.neon-*`, `.field`, `.btn.xl` y `.fade-in` ya existen.
3. Crear `lib/contact.ts` con `CONTACT_LIMITS`, los tipos y `validateContact`.
4. Crear `app/api/contact/route.ts` (`POST`): parsear JSON, validar con `validateContact`, enviar con Resend y devolver `ContactResponse`. Probarlo con `curl` (cuerpo válido, vacío y sin API key).
5. Crear `components/about/highlight-icon.tsx` (componente de servidor, SVG pixel portado de `HighlightIcon`).
6. Crear `components/about/contact-form.tsx` (cliente): estado `form`, `sent`, `shake`, `sending` y `error`; validación de campos vacíos como en el template (shake, sin petición); `fetch("/api/contact")`; vista de terminal en éxito; reinicio con "ENVIAR OTRO MENSAJE".
7. Crear `components/about/about-page.tsx` (servidor) con hero, divisor y sección de contacto, reutilizando `components/home/reveal.tsx` para el divisor y la sección de contacto. Crear `app/about/page.tsx` que lo renderiza.
8. Añadir "Sobre nosotros" (`/about`, activo con ruta exacta `/about`) a `components/nav.tsx` en escritorio y menú móvil.
9. Ejecutar `npm run lint` y `npm run build` sin errores; enviar un mensaje real desde `/about` y comprobar que llega al correo.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js, en particular sobre Route Handlers y `cacheComponents`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/about` muestra el título "ACERCA DE ARCADE VAULT", el párrafo de misión y 3 destacados con su icono (corazón, navegador, planta).
- [ ] Se ve el divisor con 24 píxeles animados y debajo la sección "CONTÁCTANOS" con 3 avisos y el formulario.
- [ ] La nav muestra "Sobre nosotros" en escritorio y en el menú móvil; se resalta solo en `/about` y lleva a `/about`.
- [ ] Enviar con algún campo vacío (o solo espacios) sacude el formulario ~400 ms y no realiza ninguna petición a `/api/contact`.
- [ ] Enviar con datos válidos llama a `POST /api/contact`, el botón muestra "ENVIANDO…" y queda deshabilitado mientras dura la petición.
- [ ] Con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` válidos, el mensaje llega a `luispv.1002@gmail.com` con asunto `Contacto Arcade Vault — {nombre}`, nombre, correo y mensaje en el cuerpo, y `Reply-To` igual al correo del formulario.
- [ ] Tras un envío correcto se muestra la terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE EN MAYÚSCULAS}._".
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [ ] Si Resend falla o falta `RESEND_API_KEY`, se muestra una línea `[ERROR]` en estilo terminal, los datos escritos se conservan y se puede reintentar.
- [ ] `POST /api/contact` devuelve `400` con campos vacíos, un correo inválido o un campo que excede `CONTACT_LIMITS`; `500` si falla el envío; en ningún caso expone la API key ni el error interno de Resend.
- [ ] La API key no aparece en el código cliente, en el bundle ni en el repositorio (`.env.local` está ignorado y `.env.example` no contiene secretos).
- [ ] Los elementos `.reveal` aparecen al hacer scroll y no hay contenido invisible con JavaScript desactivado o con `prefers-reduced-motion`.
- [ ] A 375 px de ancho no hay scroll horizontal en `/about` y el formulario es usable.
- [ ] La consola del navegador no muestra errores de hidratación en `/about`.

## Decisiones

- **Sí:** Route Handler `POST /api/contact` (decidido). Endpoint explícito, fácil de probar con `curl` y reutilizable.
- **No:** Server Action con `useActionState`. Menos código, pero el usuario eligió el endpoint REST.
- **Sí:** ruta `/about` (decidido), coherente con `/games`.
- **No:** `/acerca-de`. Más cercana al idioma de `/acceso` y `/salon`, pero distinta de `/games`.
- **Sí:** enlace de nav con el texto "Sobre nosotros" (decidido), aunque el título de la página conserva "ACERCA DE ARCADE VAULT" del template. El template llamaba "Acerca de" al enlace; se respeta la elección del usuario.
- **Sí:** remitente `onboarding@resend.dev` y destinatario `luispv.1002@gmail.com` (decidido). No requiere dominio verificado; ambos se leen de configuración (el destinatario de `CONTACT_TO_EMAIL`) para cambiarlos sin tocar código.
- **No:** dominio propio verificado ahora. Se pospone hasta que haya dominio.
- **Sí:** solo validación en servidor y mensaje de error (decidido), sin honeypot ni rate limiting.
- **No:** honeypot / rate limiting. Se acepta el riesgo de spam en este MVP; quedan para una spec futura.
- **Sí:** `replyTo` con el correo del remitente. Permite responder directamente desde el buzón sin exponer al remitente como `from`.
- **Sí:** añadir estados "enviando" y "error", que el template no tiene. Son imprescindibles con un envío real; el estilo reutiliza el de la terminal para no cambiar el look.
- **Sí:** reutilizar `Reveal` de la SPEC 02; solo `ContactForm` y `Reveal` son componentes cliente.
- **Sí:** copiar los textos del template tal cual, incluido el emoji "❤️" en el primer destacado.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Con `onboarding@resend.dev`, Resend rechaza destinatarios distintos al dueño de la cuenta | `CONTACT_TO_EMAIL` debe ser el correo de la cuenta de Resend; el error llega como `500` genérico y se muestra el estado de error. |
| Spam o abuso del endpoint público al no haber rate limiting | Aceptado en esta spec; validación con límites de longitud. Queda anotado para una spec futura. |
| Filtrar `RESEND_API_KEY` al cliente o al repositorio | Leerla solo en el Route Handler (servidor); `.env.local` ignorado por git; `.env.example` sin valores. |
| `cacheComponents` y Route Handlers | Un `POST` no se cachea; consultar las guías de Next 16 antes de escribirlo. |
| Inyección de cabeceras o HTML vía los campos | Cuerpo en texto plano (sin HTML); `subject` sin saltos de línea (se eliminan en el nombre). |
| El contenido con `.reveal` queda invisible si falla el observer o no hay JS | `Reveal` ya mantiene el contenido visible por defecto y solo lo oculta tras montar el cliente. |
| Colisión de nombres CSS con las clases de SPEC 01 y SPEC 02 | El paso 2 audita las clases antes de añadirlas. |

## Lo que **no** está en esta spec

- Dominio propio verificado en Resend.
- Honeypot, rate limiting o CAPTCHA.
- Correo de confirmación al remitente.
- Guardar mensajes en base de datos.
- Tests automatizados.
- Cambios de idioma.

Cada uno de estos, si se hace, va en su propia spec.
