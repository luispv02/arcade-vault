"use client";

import { useSyncExternalStore } from "react";
import {
  SKINS,
  getServerSkinSnapshot,
  getSkinSnapshot,
  subscribeSkin,
  writeSkin,
  type Skin,
} from "@/lib/skins";

/** Skin activa (compartida por todos los juegos, guardada en `av_skin`). */
export function useSkin(): Skin {
  return useSyncExternalStore(
    subscribeSkin,
    getSkinSnapshot,
    getServerSkinSnapshot,
  );
}

/** Desplegable de skins para el HUD de cualquier player. */
export function SkinSelect() {
  const skin = useSkin();
  return (
    <label className="skin-select">
      <span>SKIN</span>
      <select
        value={skin}
        onChange={(e) => writeSkin(e.target.value as Skin)}
        aria-label="Skin del juego"
      >
        {SKINS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
