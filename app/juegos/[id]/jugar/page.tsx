import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function JugarPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  if (!GAMES.some((g) => g.id === id)) notFound();

  return <GamePlayer id={id} />;
}
