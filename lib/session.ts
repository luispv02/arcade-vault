export interface SessionUser {
  name: string; // máx. 10 caracteres, mayúsculas
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

// Copia en memoria: si localStorage está bloqueado, la sesión vive solo aquí.
let memoryRaw: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Suscripción para useSyncExternalStore (incluye cambios desde otras pestañas). */
export function subscribeUser(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Snapshot crudo (string estable) de `av_user`. */
export function getUserSnapshot(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return memoryRaw;
  }
}

export function getServerUserSnapshot(): string | null {
  return null;
}

/** Convierte el snapshot crudo en un usuario; null si no hay o es inválido. */
export function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as SessionUser).name === "string"
    ) {
      return { name: (parsed as SessionUser).name };
    }
  } catch {}
  return null;
}

export function writeUser(user: SessionUser): void {
  const raw = JSON.stringify(user);
  memoryRaw = raw;
  try {
    localStorage.setItem(USER_KEY, raw);
  } catch {}
  emit();
}

export function clearUser(): void {
  memoryRaw = null;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
  emit();
}

export function appendScore(entry: Omit<SavedScore, "at">): void {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    const all: SavedScore[] = Array.isArray(parsed) ? parsed : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}
