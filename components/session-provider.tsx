"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  useMemo,
  type ReactNode,
} from "react";
import {
  appendScore,
  clearUser,
  getServerUserSnapshot,
  getUserSnapshot,
  parseUser,
  subscribeUser,
  writeUser,
  type SavedScore,
  type SessionUser,
} from "@/lib/session";

interface SessionContextValue {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // En el servidor y en el primer render de hidratación el snapshot es null
  // (invitado); tras el montaje React lee `av_user` sin errores de hidratación.
  const raw = useSyncExternalStore(
    subscribeUser,
    getUserSnapshot,
    getServerUserSnapshot,
  );
  const user = useMemo(() => parseUser(raw), [raw]);

  const login = useCallback((u: SessionUser) => {
    writeUser(u);
  }, []);

  const logout = useCallback(() => {
    clearUser();
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    appendScore(entry);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, saveScore }),
    [user, login, logout, saveScore],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
