import { Suspense } from "react";
import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};

export default function SalonPage() {
  return (
    <Suspense fallback={null}>
      <Hall />
    </Suspense>
  );
}

async function Hall() {
  const games = await getGames();
  return <HallOfFame games={games} />;
}
