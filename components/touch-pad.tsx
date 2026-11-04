"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchAction } from "@/lib/games/touch";
export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 55;
const ALL_DIRECTIONS: TouchAction[] = ["up", "left", "right", "down"];
const ARROW_LABEL: Record<string, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
export interface TouchPadProps {
  onInput: (action: TouchAction, down: boolean) => void;
  /** Etiqueta de cada botón de acción; si falta la clave, el botón no se pinta. */
  buttons?: { a?: string; b?: string };
  /** Acciones con auto-repetición al mantener pulsado (Tetris: left, right, down). */
  repeat?: TouchAction[];
  /** Flechas que usa el juego; el resto se pinta apagado. Por defecto, las 4. */
  directions?: TouchAction[];
}
// Mando virtual (SPEC 10): cruceta + botones A/B. Solo se muestra con puntero táctil
// (CSS `@media (pointer: coarse)`); aquí no se lee `window`, así que no hay riesgo de hidratación.
// Es solo entrada: llama a `onInput` y el motor decide qué hacer.
export function TouchPad({
  onInput,
  buttons = {},
  repeat = [],
  directions = ALL_DIRECTIONS,
}: TouchPadProps) {
  const [pressed, setPressed] = useState<ReadonlySet<TouchAction>>(new Set());
  // Siempre apunta al último `onInput` sin recrear los manejadores.
  const onInputRef = useRef(onInput);
  useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);
  const repeatRef = useRef(repeat);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  // Acciones activas y sus temporizadores de repetición (por instancia, no globales).
  const active = useRef(new Map<TouchAction, number>());
  const timers = useRef(new Map<TouchAction, { t?: number; i?: number }>());
  const clearTimers = useCallback((action: TouchAction) => {
    const tm = timers.current.get(action);
    if (!tm) return;
    window.clearTimeout(tm.t);
    window.clearInterval(tm.i);
    timers.current.delete(action);
  }, []);
  const syncPressed = useCallback(() => {
    setPressed(new Set(active.current.keys()));
  }, []);
  const press = useCallback(
    (action: TouchAction, pointerId: number) => {
      if (active.current.has(action)) return;
      active.current.set(action, pointerId);
      onInputRef.current(action, true);
      if (repeatRef.current.includes(action)) {
        const tm: { t?: number; i?: number } = {};
        timers.current.set(action, tm);
        tm.t = window.setTimeout(() => {
          tm.i = window.setInterval(
            () => onInputRef.current(action, true),
            REPEAT_INTERVAL_MS,
          );
        }, REPEAT_DELAY_MS);
      }
      syncPressed();
    },
    [syncPressed],
  );
  const release = useCallback(
    (action: TouchAction) => {
      if (!active.current.has(action)) return;
      active.current.delete(action);
      clearTimers(action);
      onInputRef.current(action, false);
      syncPressed();
    },
    [clearTimers, syncPressed],
  );
  // Suelta todo al desmontar y cuando la pestaña pierde el foco o se oculta.
  useEffect(() => {
    const activeMap = active.current;
    const releaseAll = () => {
      for (const action of [...activeMap.keys()]) release(action);
    };
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", releaseAll);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", releaseAll);
      for (const action of [...activeMap.keys()]) {
        clearTimers(action);
        activeMap.delete(action);
        onInputRef.current(action, false);
      }
    };
  }, [release, clearTimers]);
  const bind = (action: TouchAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      press(action, e.pointerId);
    },
    onPointerUp: () => release(action),
    onPointerCancel: () => release(action),
    onLostPointerCapture: () => release(action),
    // Con la captura activa no hay `pointerleave`: si el dedo sale del botón, se suelta.
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) release(action);
    },
  });
  const arrow = (action: TouchAction) => {
    const enabled = directions.includes(action);
    return (
      <button
        type="button"
        className={`tp-key tp-${action}`}
        data-on={pressed.has(action) || undefined}
        disabled={!enabled}
        aria-label={ARROW_LABEL[action]}
        tabIndex={-1}
        {...(enabled ? bind(action) : {})}
      >
        <span className="tp-arrow" aria-hidden="true" />
      </button>
    );
  };
  const action = (a: "a" | "b") =>
    buttons[a] ? (
      <button
        type="button"
        className={`tp-btn tp-btn-${a}`}
        data-on={pressed.has(a) || undefined}
        aria-label={buttons[a]}
        tabIndex={-1}
        {...bind(a)}
      >
        <span className="tp-letter" aria-hidden="true">
          {a.toUpperCase()}
        </span>
        <span className="tp-name" aria-hidden="true">
          {buttons[a]}
        </span>
      </button>
    ) : null;
  return (
    <div
      className="touch-pad"
      onContextMenu={(e) => e.preventDefault()}
      role="group"
      aria-label="Mando táctil"
    >
      <div className="tp-dpad">
        {arrow("up")}
        {arrow("left")}
        <span className="tp-hub" aria-hidden="true" />
        {arrow("right")}
        {arrow("down")}
      </div>
      <div className="tp-actions">
        {action("b")}
        {action("a")}
      </div>
    </div>
  );
}
