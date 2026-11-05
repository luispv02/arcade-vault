// Usuario con sesión real de Supabase (SPEC 11). `name` es el username del perfil.
export interface SessionUser {
  id: string;
  name: string; // 3–10 caracteres, mayúsculas
  email: string | null;
  /** Foto del proveedor OAuth (Google/GitHub); null con email y contraseña. */
  avatarUrl: string | null;
}
export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
const SCORES_KEY = "av_scores";
/** Clave de la sesión local anterior a SPEC 11; se borra al arrancar. */
export const LEGACY_USER_KEY = "av_user";
export function appendScore(entry: Omit<SavedScore, "at">): void {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(SCORES_KEY) || "[]",
    );
    const all: SavedScore[] = Array.isArray(parsed) ? parsed : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}
