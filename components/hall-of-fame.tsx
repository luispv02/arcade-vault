"use client";

import Link from "next/link";
import type { GameWithStats } from "@/lib/games";
import type { ScoreRow } from "@/lib/data";
import { useSession } from "@/components/session-provider";

const fmt = (n: number) => n.toLocaleString("es-ES");

export function HallOfFame({
  games,
  game,
  rows,
}: {
  games: GameWithStats[];
  game: GameWithStats;
  rows: ScoreRow[];
}) {
  const { user } = useSession();
  // Mejor posición del nombre de la sesión, solo si aparece en el top mostrado.
  const mine = user ? rows.find((r) => r.name === user.name) : undefined;
  const podium = [
    { row: rows[1], cls: "silver", pos: "02" },
    { row: rows[0], cls: "gold", pos: "01" },
    { row: rows[2], cls: "bronze", pos: "03" },
  ];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (game.id === g.id ? " active" : "")}
            aria-current={game.id === g.id ? "page" : undefined}
            scroll={false}
          >
            {g.title}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            SIN PUNTUACIONES
          </div>
          <div>Nadie ha jugado a {game.title} todavía. ¡Sé el primero!</div>
        </div>
      ) : (
        <>
          <div className="podium">
            {podium.map(({ row, cls, pos }) =>
              row ? (
                <div key={cls} className={"podium-slot " + cls}>
                  {cls === "gold" && (
                    <div
                      className="pixel"
                      style={{
                        fontSize: 9,
                        color: "var(--gold)",
                        letterSpacing: "0.18em",
                      }}
                    >
                      CAMPEÓN
                    </div>
                  )}
                  <div
                    className="rank-num"
                    style={
                      cls === "gold"
                        ? { fontSize: 36, marginTop: 4 }
                        : undefined
                    }
                  >
                    {pos}
                  </div>
                  <div className="name">{row.name}</div>
                  <div
                    className="score"
                    style={cls === "gold" ? { fontSize: 20 } : undefined}
                  >
                    {fmt(row.score)}
                  </div>
                  <div className="date">{row.date}</div>
                </div>
              ) : null,
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                // La key incluye el juego para que la animación se repita al cambiar de pestaña.
                key={`${game.id}-${i}`}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {mine && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(mine.rank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {mine.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {fmt(mine.score)}
                  </div>
                  <div className="dt">{mine.date}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
