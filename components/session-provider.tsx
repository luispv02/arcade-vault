"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  LEGACY_USER_KEY,
  appendScore,
  type SavedScore,
  type SessionUser,
} from "@/lib/session";
interface SessionContextValue {
  user: SessionUser | null;
  logout: () => Promise<void>;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
}
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  // Servidor y primer render de hidratación: invitado (null). Tras montar,
  // `onAuthStateChange` entrega la sesión real sin errores de hidratación.
  const [user, setUser] = useState<SessionUser | null>(null);
  // Descarta respuestas de perfil que lleguen fuera de orden.
  const loadId = useRef(0);
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_USER_KEY);
    } catch {}
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // Sin variables de entorno de Supabase: todo funciona como invitado.
    }
    const load = async (session: Session | null) => {
      const id = ++loadId.current;
      if (!session) {
        setUser(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();
      if (id !== loadId.current) return;
      setUser(
        data
          ? {
              id: session.user.id,
              name: data.username,
              email: session.user.email ?? null,
            }
          : null,
      );
    };
    // Se emite INITIAL_SESSION al suscribirse. Dentro del callback no se deben
    // llamar métodos de supabase de forma síncrona (riesgo de bloqueo): se difiere.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void load(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const logout = useCallback(async () => {
    try {
      await createClient().auth.signOut();
    } catch {}
    loadId.current++;
    setUser(null);
  }, []);
  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    appendScore(entry);
  }, []);
  const value = useMemo(
    () => ({ user, logout, saveScore }),
    [user, logout, saveScore],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
