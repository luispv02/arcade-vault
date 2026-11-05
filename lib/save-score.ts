import { createClient } from "@/lib/supabase/client";
// Inserta una puntuación en `scores`. Envía game_id, name y score; con sesión
// (SPEC 11) también `user_id`, y la RLS exige que `name` sea el username del autor.
// El invitado no envía `user_id`. El resto de columnas las rellena la base de datos.
export async function saveScore(
  gameId: string,
  name: string,
  score: number,
  userId?: string | null,
): Promise<{ ok: boolean }> {
  try {
    const { error } = await createClient()
      .from("scores")
      .insert({
        game_id: gameId,
        name,
        score,
        ...(userId ? { user_id: userId } : {}),
      });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
