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
  const [imgFailed, setImgFailed] = useState(false);
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
        {user.avatarUrl && !imgFailed ? (
          // Foto del proveedor: next/image exigiría configurar cada dominio.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          // Sin foto (email y contraseña) o si no carga: inicial del username.
          <span aria-hidden="true">{user.name.charAt(0)}</span>
        )}
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
