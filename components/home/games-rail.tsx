import Link from "next/link";
import { getGames } from "@/lib/data";

/** Los primeros 6 juegos del catálogo (Supabase). Debe renderizarse dentro de <Suspense>. */
export async function GamesRail() {
  const games = await getGames();
  return (
    <div className="mini-rail">
      {games.slice(0, 6).map((g) => (
        <Link key={g.id} href={`/juegos/${g.id}`} className="mini-card">
          <div className="mini-cover">
            <div className={"cover-bg " + g.cover}></div>
          </div>
          <div className="mini-meta">
            <div className="mini-title">{g.title}</div>
            <div className="mini-cat">{g.cat}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function GamesRailFallback() {
  return (
    <div className="mini-rail" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="mini-card">
          <div className="mini-cover"></div>
          <div className="mini-meta">
            <div className="mini-title">…</div>
          </div>
        </div>
      ))}
    </div>
  );
}
