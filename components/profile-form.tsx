"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { USERNAME_RE, authErrorMessage, normalizeUsername } from "@/lib/auth";
// Pantalla de /acceso/perfil (SPEC 11): los usuarios que entran con Google o GitHub
// reciben un username provisional y aquí eligen el definitivo, una sola vez.
export function ProfileForm() {
  const router = useRouter();
  const { user } = useSession();
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = user?.id;
  const provisional = user?.name;
  // Si el username ya está confirmado no hay nada que elegir: fuera de esta pantalla.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void createClient()
      .from("profiles")
      .select("username, username_confirmed")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data || data.username_confirmed) {
          router.replace("/games");
          return;
        }
        setUsername(data.username);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, router]);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !userId) return;
    const name = normalizeUsername(username);
    if (!USERNAME_RE.test(name)) {
      setError("De 3 a 10 caracteres: letras sin tilde, números o guion bajo.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ username: name, username_confirmed: true })
        .eq("id", userId)
        .select("username")
        .maybeSingle();
      if (updateError) {
        setError(
          updateError.code === "23505"
            ? "Ese usuario ya está en uso. Prueba otro."
            : authErrorMessage({}),
        );
        return;
      }
      // Sin fila actualizada: el usuario ya estaba confirmado (la RLS lo impide).
      if (data) {
        // Renueva el token para que el SessionProvider relea el perfil.
        await supabase.auth.refreshSession();
      }
      router.push("/games");
    } catch {
      setError(authErrorMessage({}));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ELIGE TU USUARIO</h2>
        </div>
        {!ready ? (
          <p className="auth-note" role="status">
            Cargando tu perfil…
          </p>
        ) : (
          <>
            <p className="auth-note">
              Te asignamos <strong>{provisional}</strong> como usuario
              provisional. Es el nombre que verán los demás en el Salón de la
              Fama. Elígelo ahora: después no podrás cambiarlo.
            </p>
            {error && (
              <div className="auth-alert" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="profile-username">Usuario</label>
                <input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="characters"
                  aria-invalid={error ? true : undefined}
                />
              </div>
              <button
                className="btn lg"
                type="submit"
                disabled={busy}
                style={{ width: "100%", marginTop: 8 }}
              >
                {busy ? "GUARDANDO…" : "CONFIRMAR USUARIO"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
