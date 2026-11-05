"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { saveScore } from "@/lib/save-score";
type SaveStatus = "idle" | "saving" | "saved" | "error";
// Modal «FIN DEL JUEGO» común a todos los juegos. El player lo monta solo cuando
// la partida termina y lo desmonta al reiniciar, así que el estado de guardado
// (una vez por partida) y el nombre editado empiezan de cero en cada partida.
export function GameOverModal({
  gameId,
  score,
  onPlayAgain,
}: {
  gameId: string;
  score: number;
  onPlayAgain: () => void;
}) {
  const { user } = useSession();
  const [save, setSave] = useState<SaveStatus>("idle");
  // Invitado: nombre editable (por defecto INVITADO). Con sesión (SPEC 11) el nombre
  // es el username del perfil, fijo: la RLS de `scores` exige que coincida.
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const locked = !!user;
  const name = user?.name ?? nameEdit ?? "INVITADO";
  // Con el modal abierto, el motor no debe recibir teclas que no vengan del modal
  // (p. ej. ESPACIO con el foco en el <body> reiniciaría la partida sin guardar).
  useEffect(() => {
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
  }, []);
  const submit = async () => {
    const finalName = name.trim().toUpperCase().slice(0, 10);
    if (!finalName || save === "saving" || save === "saved") return;
    setSave("saving");
    const { ok } = await saveScore(gameId, finalName, score, user?.id);
    setSave(ok ? "saved" : "error");
  };
  return (
    // El teclado del modal no debe llegar al motor (ESPACIO reiniciaría la partida detrás).
    <div
      className="modal-bd"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <h2>FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{score.toLocaleString("es-ES")}</div>
        {save !== "saved" ? (
          <>
            <form
              className="input-row"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                value={name}
                onChange={(e) =>
                  setNameEdit(e.target.value.toUpperCase().slice(0, 10))
                }
                readOnly={locked}
                placeholder="TU NOMBRE"
                aria-label={locked ? "Tu usuario" : "Tu nombre"}
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
          <button type="button" className="btn" onClick={onPlayAgain}>
            JUGAR DE NUEVO
          </button>
          <Link href="/games" className="btn magenta">
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}
