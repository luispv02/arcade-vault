"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { GameOverModal } from "@/components/game-over-modal";
import { MobileHudMenu } from "@/components/mobile-hud-menu";
import { SkinSelect, useSkin } from "@/components/skin-select";
import { TouchPad } from "@/components/touch-pad";
import type { TouchAction } from "@/lib/games/touch";
import { getSkinSnapshot } from "@/lib/skins";
import { startTetris, type TetrisSnapshot } from "@/lib/games/tetris/game";
const INITIAL: TetrisSnapshot = {
  score: 0,
  lines: 0,
  level: 1,
  state: "playing",
};
// Mando táctil: A rota, B suelta la pieza; mover y bajar repiten al mantener pulsado.
const PAD_BUTTONS = { a: "ROTAR", b: "CAER" };
const PAD_REPEAT: TouchAction[] = ["left", "right", "down"];
const PAD_DIRECTIONS: TouchAction[] = ["up", "left", "right", "down"];
// Juego real: el motor (lib/games/tetris) dibuja en el canvas y avisa a React
// solo cuando cambian puntos, líneas, nivel o estado. React nunca controla el juego.
export function TetrisPlayer() {
  const { user } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snap, setSnap] = useState<TetrisSnapshot>(INITIAL);
  // Cambiar `run` destruye el motor y arranca una partida nueva (JUGAR DE NUEVO).
  const [run, setRun] = useState(0);
  const skin = useSkin();
  const gameRef = useRef<ReturnType<typeof startTetris> | null>(null);
  const sessionName = user?.name ?? "INVITADO";
  const gameOver = snap.state === "gameover";
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = startTetris(canvas, {
      onStateChange: setSnap,
      skin: getSkinSnapshot(),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [run]);
  // Cambiar de skin no reinicia la partida: solo cambia la paleta del motor.
  useEffect(() => {
    gameRef.current?.setSkin(skin);
  }, [skin]);
  const onTouchInput = useCallback((action: TouchAction, down: boolean) => {
    gameRef.current?.input(action, down);
  }, []);
  const playAgain = () => {
    setSnap(INITIAL);
    setRun((r) => r + 1);
  };
  return (
    <div className="av-player fade-in" data-skin={skin}>
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat hud-secondary">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {sessionName}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{snap.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives hud-secondary">
            <div className="l">Líneas</div>
            <div className="v">{snap.lines}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(snap.level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn ghost hud-mobile-only"
            onClick={() => gameRef.current?.togglePause()}
          >
            {snap.state === "paused" ? "REANUDAR" : "PAUSA"}
          </button>
          <MobileHudMenu exitHref="/juegos/tetris" />
          <div className="hud-desktop-only" style={{ display: "contents" }}>
            <SkinSelect />
            <Link href="/juegos/tetris" className="btn ghost">
              SALIR
            </Link>
          </div>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            className="tetris-canvas"
            width={460}
            height={600}
            aria-label="Juego Tetris"
          />
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>TETRIS · CRT-83 · 60 HZ</span>
          <span>← → MOVER · ↑ X ROTAR · ↓ BAJAR · ESPACIO CAE · P PAUSA</span>
        </div>
      </div>
      <TouchPad
        onInput={onTouchInput}
        buttons={PAD_BUTTONS}
        repeat={PAD_REPEAT}
        directions={PAD_DIRECTIONS}
      />
      {gameOver && (
        <GameOverModal
          gameId="tetris"
          score={snap.score}
          onPlayAgain={playAgain}
        />
      )}
    </div>
  );
}
