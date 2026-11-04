# Juegos con skins (@skin-designer)

Skins obligatorias: `neon` · `retro` · `clasico` (todas legibles en modo oscuro).

Leyenda: ✅ hecha y verificada en oscuro · ⚠️ hecha, falla en oscuro o sin verificar · ❌ falta

## Cobertura

| ID           | Título     | neon | retro | clasico | Oscuro verificado | Spec | Última actualización |
| ------------ | ---------- | ---- | ----- | ------- | ----------------- | ---- | -------------------- |
| `asteroides` | ASTEROIDES | ⚠️   | ⚠️    | ⚠️      | Contrastes calculados; sin revisión visual | — (pedido directo del usuario, sin spec) | 2026-11-04 |
| `tetris` | TETRIS | ⚠️   | ⚠️    | ⚠️      | Contrastes calculados; sin revisión visual | — (pedido directo, sin spec) | 2026-11-04 |
| `arkanoid` | ARKANOID | ⚠️   | ⚠️    | ⚠️      | Contrastes calculados; sin revisión visual | — (pedido directo, sin spec) | 2026-11-04 |
| `serpentina` | SERPENTINA | ⚠️   | ⚠️    | ⚠️      | Contrastes calculados; sin revisión visual | — (pedido directo, sin spec) | 2026-11-04 |

## Infraestructura compartida

- Estado: ⚠️ `lib/skins.ts` (tipo `Skin`, `SKINS`, una paleta por juego, store `av_skin` con `useSyncExternalStore`), `components/skin-select.tsx` (`useSkin` + `SkinSelect`, compartido por los 4 players) y tokens `[data-skin]` en `app/globals.css`. Para un juego nuevo: añadir su paleta en `lib/skins.ts`, `skin`/`setSkin` en su motor y `<SkinSelect />` en su player.
- Spec: — (el usuario pidió omitirla)

## Historial

| Fecha | ID  | Cambio | Notas |
| ----- | --- | ------ | ----- |
| 2026-11-04 | `asteroides` | ASTEROIDES | ⚠️   | ⚠️    | ⚠️      | Contrastes calculados; sin revisión visual | — (pedido directo del usuario, sin spec) | 2026-11-04 |
| 2026-11-04 | `asteroides` | 3 skins implementadas | Motor recibe `skin` y expone `setSkin`; cambio en caliente sin reiniciar. Contrastes sobre fondo: neon ≥6.2:1, retro ≥5.0:1, clásico ≥5.9:1. Pendiente revisión visual. |
| 2026-11-04 | `tetris`, `arkanoid`, `serpentina` | 3 skins implementadas | Selector reutilizado (`SkinSelect`). Neón de Arkanoid y Serpentina conserva sus sprites; retro/clásico usan formas planas. Pendiente revisión visual. |
