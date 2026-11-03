"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Juego real: el motor (lib/games/asteroids) dibuja en el canvas y avisa a React
// solo cuando cambian puntos, vidas, nivel o estado. React nunca controla el juego.
export function AsteroidsPlayer() {
  const { user } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snap, setSnap] = useState<AsteroidsSnapshot>(INITIAL);
  const [save, setSave] = useState<SaveStatus>("idle");
  // Cambiar `run` destruye el motor y arranca una partida nueva (JUGAR DE NUEVO).
  const [run, setRun] = useState(0);
  // null = sin editar: se usa el nombre de la sesión (que se lee tras el montaje).
  const [nameEdit, setNameEdit] = useState<string | null>(null);

  const sessionName = user?.name ?? "INVITADO";
  const name = nameEdit ?? sessionName;
  const gameOver = snap.state === "gameover";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = startAsteroids(canvas, {
      onStateChange: (s) => {
        setSnap(s);
        // Cada GAME OVER es una partida nueva: el guardado anterior no cuenta.
        if (s.state !== "gameover") setSave("idle");
      },
    });
    return () => game.destroy();
  }, [run]);

  // Con el modal abierto, el motor no debe recibir teclas que no vengan del modal
  // (p. ej. ESPACIO con el foco en el <body> reiniciaría la partida sin guardar).
  useEffect(() => {
    if (!gameOver) return;
    const block = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest(".modal")) return;
      e.stopPropagation();
      if (e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", block, true);
    window.addEventListener("keyup", block, true);
    return () => {
      window.removeEventListener("keydown", block, true);
      window.removeEventListener("keyup", block, true);
    };
  }, [gameOver]);

  const playAgain = () => {
    setSnap(INITIAL);
    setSave("idle");
    setRun((r) => r + 1);
  };

  const saveScore = async () => {
    const finalName = name.trim().toUpperCase().slice(0, 10);
    if (!finalName || save === "saving" || save === "saved") return;
    setSave("saving");
    try {
      const { error } = await createClient()
        .from("scores")
        .insert({ game_id: "asteroides", name: finalName, score: snap.score });
      setSave(error ? "error" : "saved");
    } catch {
      setSave("error");
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {sessionName}
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

      {gameOver && (
        // El teclado del modal no debe llegar al motor (ESPACIO reiniciaría la partida detrás).
        <div
          className="modal-bd"
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{snap.score.toLocaleString("es-ES")}</div>
            {save !== "saved" ? (
              <>
                <form
                  className="input-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveScore();
                  }}
                >
                  <input
                    value={name}
                    onChange={(e) =>
                      setNameEdit(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TU NOMBRE"
                    aria-label="Tu nombre"
                    maxLength={10}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn yellow"
                    disabled={save === "saving" || !name.trim()}
                  >
                    {save === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </form>
                {save === "error" && (
                  <div
                    className="mono"
                    role="alert"
                    style={{ color: "var(--magenta)", fontSize: 12 }}
                  >
                    NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={playAgain}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
