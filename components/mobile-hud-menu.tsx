"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { SkinSelect } from "@/components/skin-select";
// Menú ☰ del HUD compacto en móvil (SPEC 10): agrupa Skin y SALIR, que en escritorio
// siguen visibles en la barra. Solo se muestra con `.hud-mobile-only` (ver globals.css).
export function MobileHudMenu({ exitHref }: { exitHref: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  // Un toque fuera del menú lo cierra.
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);
  return (
    <div className="hud-menu hud-mobile-only" ref={rootRef}>
      <button
        type="button"
        className="btn ghost hud-menu-btn"
        aria-label="Opciones del juego"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        ☰
      </button>
      {open && (
        <div className="hud-menu-panel" id={panelId}>
          <SkinSelect />
          <Link
            href={exitHref}
            className="btn ghost"
            onClick={() => setOpen(false)}
          >
            SALIR
          </Link>
        </div>
      )}
    </div>
  );
}
