import { Suspense } from "react";
import { Library } from "@/components/library";
import { getGames } from "@/lib/data";

// Página síncrona: los datos de Supabase se leen dentro de <Suspense> (cacheComponents).
export default function GamesPage() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <Suspense fallback={<LibraryFallback />}>
        <LibraryLoader />
      </Suspense>
    </div>
  );
}

async function LibraryLoader() {
  const games = await getGames();
  return <Library games={games} />;
}

function LibraryFallback() {
  return (
    <div
      className="pixel"
      style={{
        textAlign: "center",
        padding: 80,
        fontSize: 12,
        color: "var(--ink-faint)",
      }}
    >
      CARGANDO JUEGOS…
    </div>
  );
}
