"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
// Icono de cuenta en la barra (SPEC 11): despliega una tarjeta de solo lectura con
// Usuario y Correo y la opción de cerrar sesión. Solo se pinta si hay sesión.
export function UserMenu() {
  const { user, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cardId = useId();
  // Un toque fuera o Esc cierran la tarjeta (Esc devuelve el foco al icono).
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (!user) return null;
  const signOut = async () => {
    setOpen(false);
    await logout();
    // El perfil solo existe con sesión: sin ella, el proxy lo mandaría a /acceso.
    if (pathname.startsWith("/acceso/perfil")) router.push("/acceso");
  };
  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="btn ghost user-menu-btn"
        aria-label={`Cuenta de ${user.name}`}
        aria-expanded={open}
        aria-controls={cardId}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Jugador en pixel art; hereda color y brillo del botón. */}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <g fill="currentColor">
            <rect x="5" y="2" width="6" height="2" />
            <rect x="4" y="4" width="8" height="4" />
            <rect x="5" y="8" width="6" height="1" />
            <rect x="2" y="10" width="12" height="2" />
            <rect x="2" y="12" width="12" height="2" opacity="0.55" />
          </g>
        </svg>
        <span className="user-menu-name">{user.name}</span>
      </button>
      {open && (
        <div className="user-menu-card" id={cardId}>
          <dl>
            <div>
              <dt>Usuario</dt>
              <dd className="user-menu-username">{user.name}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{user.email ?? "Sin correo"}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn ghost user-menu-logout"
            onClick={signOut}
          >
            CERRAR SESIÓN
          </button>
        </div>
      )}
    </div>
  );
}
