"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { UserMenu } from "@/components/user-menu";
type NavKey = "inicio" | "biblioteca" | "salon" | "about" | "acceso";
function isActive(pathname: string, key: NavKey): boolean {
  switch (key) {
    case "inicio":
      return pathname === "/";
    case "biblioteca":
      // También activa en detalle y reproductor.
      return pathname.startsWith("/games") || pathname.startsWith("/juegos");
    case "salon":
      return pathname.startsWith("/salon");
    case "about":
      return pathname === "/about";
    case "acceso":
      return pathname.startsWith("/acceso");
  }
}
export function Nav() {
  const pathname = usePathname();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const cls = (key: NavKey) => (isActive(pathname, key) ? "active" : undefined);
  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("inicio")}>
            Inicio
          </Link>
          <Link href="/games" className={cls("biblioteca")}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("salon")}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={cls("about")}>
            Sobre nosotros
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <UserMenu />
        ) : (
          <Link
            href="/acceso"
            className="btn auth-btn"
            aria-label="Iniciar Sesión"
          >
            <span className="auth-full">Iniciar Sesión</span>
            <span className="auth-short" aria-hidden="true">
              Entrar
            </span>
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          {/* Tres barras pixel; heredan el color y el brillo del botón. */}
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <g fill="currentColor">
              <rect x="2" y="3" width="12" height="2" />
              <rect x="2" y="7" width="12" height="2" />
              <rect x="2" y="11" width="12" height="2" />
            </g>
          </svg>
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={cls("inicio")} onClick={close}>
          Inicio
        </Link>
        <Link href="/games" className={cls("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/about" className={cls("about")} onClick={close}>
          Sobre nosotros
        </Link>
        {user ? null : (
          <Link href="/acceso" className={cls("acceso")} onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
