import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/data";
import { GamePlayer } from "@/components/game-player";
import { AsteroidsPlayer } from "@/components/asteroids-player";
import { TetrisPlayer } from "@/components/tetris-player";

// Juegos con motor real. El resto de ids sigue con el placeholder `GamePlayer`.
const PLAYERS: Record<string, () => React.JSX.Element> = {
  asteroides: AsteroidsPlayer,
  tetris: TetrisPlayer,
};

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

  const RealPlayer = PLAYERS[id];
  if (RealPlayer) return <RealPlayer />;

  return <GamePlayer game={game} />;
}
