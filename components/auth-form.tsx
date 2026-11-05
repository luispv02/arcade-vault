"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import {
  authErrorMessage,
  normalizeEmail,
  normalizeUsername,
  validateSignIn,
  validateSignUp,
  type FieldErrors,
} from "@/lib/auth";
const CALLBACK_ERROR =
  "No pudimos completar el acceso. Vuelve a intentarlo o usa otro método.";
export function AuthForm({
  callbackError = false,
}: {
  callbackError?: boolean;
}) {
  const router = useRouter();
  const { logout } = useSession();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(
    callbackError ? CALLBACK_ERROR : null,
  );
  const [busy, setBusy] = useState(false);
  // Correo al que se envió la confirmación; muestra el panel "REVISA TU CORREO".
  const [sentTo, setSentTo] = useState<string | null>(null);
  const switchTab = (next: "in" | "up") => {
    setTab(next);
    setErrors({});
    setFormError(null);
  };
  const signIn = async () => {
    const { error } = await createClient().auth.signInWithPassword({
      email: normalizeEmail(email),
      password: pass,
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.push("/games");
  };
  const signUp = async () => {
    const supabase = createClient();
    const name = normalizeUsername(username);
    const cleanEmail = normalizeEmail(email);
    // Comprobación previa para dar un error claro; el `unique` de la BD es la fuente de verdad.
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", name)
      .maybeSingle();
    if (taken) {
      setErrors({ username: "Ese usuario ya está en uso. Prueba otro." });
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: { username: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    // Con confirmación de correo, un correo ya registrado no devuelve error:
    // devuelve un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) {
      setFormError(authErrorMessage({ code: "email_exists" }));
      return;
    }
    // Si el proyecto no exige confirmar el correo, ya hay sesión.
    if (data.session) {
      router.push("/games");
      return;
    }
    setSentTo(cleanEmail);
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const found =
      tab === "in"
        ? validateSignIn({ email, password: pass })
        : validateSignUp({ username, email, password: pass });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await (tab === "in" ? signIn() : signUp());
    } catch {
      setFormError(authErrorMessage({}));
    } finally {
      setBusy(false);
    }
  };
  const guest = async () => {
    // Invitado: sin sesión (cierra cualquier sesión previa).
    await logout();
    router.push("/games");
  };
  const fieldError = (key: keyof FieldErrors) =>
    errors[key] ? (
      <span id={`auth-${key}-error`} className="field-error">
        {errors[key]}
      </span>
    ) : null;
  const invalid = (key: keyof FieldErrors) => (errors[key] ? true : undefined);
  const described = (key: keyof FieldErrors) =>
    errors[key] ? `auth-${key}-error` : undefined;
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>
        {sentTo ? (
          <div className="auth-sent" role="status">
            <h3>REVISA TU CORREO</h3>
            <p>
              Enviamos un enlace de confirmación a <strong>{sentTo}</strong>.
              Ábrelo para activar tu cuenta y entrar al vault.
            </p>
            <p className="auth-sent-hint">
              Si no lo ves, mira en la carpeta de spam.
            </p>
            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%", marginTop: 14 }}
              onClick={() => {
                setSentTo(null);
                setPass("");
                switchTab("in");
              }}
            >
              VOLVER A INICIAR SESIÓN
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={tab === "in" ? "on" : ""}
                onClick={() => switchTab("in")}
              >
                INICIAR SESIÓN
              </button>
              <button
                type="button"
                className={tab === "up" ? "on" : ""}
                onClick={() => switchTab("up")}
              >
                CREAR CUENTA
              </button>
            </div>
            {formError && (
              <div className="auth-alert" role="alert">
                {formError}
              </div>
            )}
            <form onSubmit={submit} noValidate>
              {tab === "up" && (
                <div className="field slide-in">
                  <label htmlFor="auth-username">Usuario</label>
                  <input
                    id="auth-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="px_kai"
                    autoComplete="username"
                    autoCapitalize="characters"
                    aria-invalid={invalid("username")}
                    aria-describedby={described("username")}
                  />
                  {fieldError("username")}
                </div>
              )}
              <div className="field">
                <label htmlFor="auth-email">Correo electrónico</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jugador@vault.gg"
                  autoComplete="email"
                  aria-invalid={invalid("email")}
                  aria-describedby={described("email")}
                />
                {fieldError("email")}
              </div>
              <div className="field">
                <label htmlFor="auth-pass">Contraseña</label>
                <input
                  id="auth-pass"
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    tab === "in" ? "current-password" : "new-password"
                  }
                  aria-invalid={invalid("password")}
                  aria-describedby={described("password")}
                />
                {fieldError("password")}
              </div>
              <button
                className="btn lg"
                type="submit"
                disabled={busy}
                style={{ width: "100%", marginTop: 8 }}
              >
                {busy
                  ? "CONECTANDO…"
                  : tab === "in"
                    ? "ENTRAR AL VAULT"
                    : "CREAR CUENTA"}
              </button>
            </form>
            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%", marginTop: 10 }}
              onClick={guest}
            >
              JUGAR COMO INVITADO
            </button>
            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button className="btn ghost" type="button">
                ◆ GOOGLE
              </button>
              <button className="btn ghost" type="button">
                ▣ GITHUB
              </button>
            </div>
            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
            </div>
          </>
        )}
      </div>
    </div>
  );
}
