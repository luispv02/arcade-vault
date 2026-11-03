---
name: add-game
description: Genera la spec para añadir un juego jugable a Arcade Vault con guardado de puntuación y leaderboard, desde una carpeta de references/templates/started-games/ o desde una idea nueva. Solo escribe la spec; la implementación se hace con /spec-impl.
disable-model-invocation: true
argument-hint: "carpeta de referencia (p. ej. 03-tetris) o descripción del juego"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /add-game — Spec para añadir un juego con leaderboard

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls references/templates/started-games/ 2>/dev/null || echo "Sin carpeta de referencias"`

Motores ya integrados:
!`ls lib/games/ 2>/dev/null || echo "Ninguno"`

¿Existe el modal común de fin de juego?
!`ls components/game-over-modal.tsx 2>/dev/null || echo "NO existe: la spec debe incluir el paso de extracción"`

---

**Aquí no se escribe código.** El resultado es una spec en `specs/` que luego ejecuta `/spec-impl`. El patrón técnico fue fijado por SPEC 05 (juego Asteroides) y SPEC 06 (tablas `games`/`scores` y leaderboard).

Argumento recibido: `$ARGUMENTS`

## Flujo

### 1. Origen del juego

- Si el argumento es (o coincide con) una carpeta de `references/templates/started-games/` (p. ej. `tetris` → `03-tetris`), lee todo lo que tenga: `README.md`, `CLAUDE.md`, `index.html`, `game.js`, CSS, `levels.js`, `assets/` y `specs/` propias. Anota estado global, acceso al DOM, entradas (teclado/ratón), sonidos, sprites, condición de fin y cómo se puntúa.
- Si no, es un juego nuevo: pregunta mecánica, controles, condición de fin y puntuación.
- Juegos originales o "de un género" están bien. No se hacen recreaciones de un juego comercial concreto (nombre, personajes, arte, música, niveles): si el origen lo es, propone título y portada propios y no copies sus assets protegidos.

### 2. Leer el patrón de referencia

Lee antes de preguntar o redactar: `specs/05-juego-asteroides.md`, `specs/06-leaderboard-y-tabla-de-juegos.md`, `lib/games/asteroids/game.ts`, `components/asteroids-player.tsx`, `app/juegos/[id]/jugar/page.tsx`, `lib/data.ts`, `lib/games.ts`, `supabase/migrations/`, y `integration-checklist.md` (en este directorio).

### 3. Leer la skill `/spec` (obligatorio antes de crear el archivo)

**Antes de escribir cualquier archivo en `specs/`, lee completas** estas dos referencias, con la herramienta Read:

- `.agents/skills/spec/SKILL.md`: el método de especificación (fases, reglas duras, cómo se numera, nombra y guarda una spec).
- `.agents/skills/spec/template.md`: la forma exacta de cada sección.

Las specs de `/add-game` se crean **siguiendo ese método**, con estas equivalencias:

- Las fases 1 y 2 de `/spec` (contexto y preguntas) las cubren los pasos 1, 2 y 4 de esta skill. Mantén su criterio de parada: no redactes hasta poder responder qué archivos aparecen o cambian, cuál es el primer y el último paso ejecutable y cómo se verifica que está terminado.
- La fase 3 (redacción) y la fase 4 (guardado) de `/spec` mandan sobre el formato: orden de secciones, cabecera con objetivo en una frase, alcance con «fuera» explícito, plan con pasos que dejan la app arrancable, criterios booleanos verificables, decisiones tomadas y descartadas, riesgos.
- Si hay conflicto entre esta skill y `/spec` sobre **cómo se escribe o guarda** la spec, gana `/spec`. Si lo hay sobre **qué contiene** (receta técnica del juego), gana `integration-checklist.md`.
- Respeta también sus reglas duras: nada de código, sin confirmar decisiones no tomadas, y detenerse tras guardar.

### 4. Preguntas (AskUserQuestion)

Solo lo que no se pueda deducir. Agrupa en 1–2 rondas, de 3 a 5 preguntas por bloque, con recomendación marcada primero. Típicas: `id`/slug y título en español; `cat` (ARCADE/PUZZLE/SHOOTER/VERSUS) y `color` (cyan/magenta/yellow/green); qué cuenta como fin de partida y puntuación final; si se mantiene el HUD del canvas; qué hacer con sonido, assets, pausa y ratón del original; `sort_order`.

### 5. Redactar y guardar la spec

Con `.agents/skills/spec/SKILL.md` y `template.md` ya leídos (paso 3), redacta siguiendo la plantilla de `/spec` y el estilo de SPEC 05/06 (en español: Estado, Depende de, Fecha, Objetivo, Por qué existe, Alcance dentro/fuera, Modelo de datos, Plan de implementación, Criterios de aceptación, Decisiones, Riesgos, Lo que no está). Debe cubrir todo `integration-checklist.md`, adaptado al juego.

- Si ya tienes toda la información, escribe la spec completa y guárdala sin pedir confirmación sección por sección (fase 3 de `/spec`). Solo si falta información, ve sección por sección.
- Archivo: `specs/NN-juego-<id>.md` (NN = siguiente número libre, dos dígitos), con `Estado: Borrador`, `Depende de: SPEC 05, SPEC 06` (verifica que existen) y la fecha leída del contexto de la sesión.
- Si no existe `specs/.spec-config.yml`, créalo como indica la fase 4 de `/spec`; si existe, no lo toques.

### 6. Cierre

Indica la ruta de la spec, que está en `Borrador` hasta que el usuario la revise y la apruebe, y que se implemente con `/spec-impl NN-juego-<id>`. **Detente ahí**: no propongas implementarla ni toques código de la app, migraciones ni BD.
