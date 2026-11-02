import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

// La página es síncrona: `params` se lee dentro de <Suspense> (cacheComponents + partialPrefetching).
export default function JugarPage(props: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <Player params={props.params} />
    </Suspense>
  );
}

async function Player({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  if (!GAMES.some((g) => g.id === id)) notFound();

  return <GamePlayer id={id} />;
}
