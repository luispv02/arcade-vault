import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/data";
import { GamePlayer } from "@/components/game-player";
import { AsteroidsPlayer } from "@/components/asteroids-player";

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
  const game = await getGame(id);
  if (!game) notFound();

  if (id === "asteroides") return <AsteroidsPlayer />;

  return <GamePlayer game={game} />;
}
