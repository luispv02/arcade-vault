"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import {
  startAsteroids,
  type AsteroidsSnapshot,
} from "@/lib/games/asteroids/game";

const INITIAL: AsteroidsSnapshot = {
  score: 0,
  lives: 3,
  level: 1,
  state: "playing",
};

// Juego real: el motor (lib/games/asteroids) dibuja en el canvas y avisa a React
// solo cuando cambian puntos, vidas, nivel o estado. React nunca controla el juego.
export function AsteroidsPlayer() {
  const { user } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snap, setSnap] = useState<AsteroidsSnapshot>(INITIAL);

  const name = user?.name ?? "INVITADO";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = startAsteroids(canvas, { onStateChange: setSnap });
    return () => game.destroy();
  }, []);

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snap.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(snap.lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snap.level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <Link href="/juegos/asteroides" className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            className="asteroids-canvas"
            width={800}
            height={600}
            aria-label="Juego Asteroides"
          />
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>ASTEROIDES · CRT-83 · 60 HZ</span>
          <span>← → ROTAR · ↑ EMPUJE · ESPACIO DISPARA</span>
        </div>
      </div>
    </div>
  );
}
