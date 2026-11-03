import { Suspense } from "react";
import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames, getTopScores } from "@/lib/data";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

// Página síncrona: `searchParams` y los datos se leen dentro de <Suspense> (cacheComponents).
export default function SalonPage(props: PageProps<"/salon">) {
  return (
    <Suspense fallback={null}>
      <Hall searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Hall({
  searchParams,
}: {
  searchParams: PageProps<"/salon">["searchParams"];
}) {
  const { juego } = await searchParams;
  const games = await getGames();
  // `?juego` ausente, repetido o inválido cae al primer juego.
  const id = typeof juego === "string" ? juego : undefined;
  const game = games.find((g) => g.id === id) ?? games[0];
  const rows = await getTopScores(game.id, 12);
  return <HallOfFame games={games} game={game} rows={rows} />;
}
