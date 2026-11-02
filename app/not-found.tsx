import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in">
      <section className="av-hero" style={{ paddingBottom: 64 }}>
        <h1 className="flicker">404</h1>
        <div className="sub">
          JUEGO NO ENCONTRADO <span className="blink">_</span>
        </div>
        <p
          style={{
            margin: "24px auto 32px",
            maxWidth: 420,
            color: "var(--ink-dim)",
          }}
        >
          Esta ficha no existe en el vault. Puede que el juego se haya retirado
          o que el enlace sea incorrecto.
        </p>
        <Link href="/" className="btn lg pulse">
          VOLVER AL VAULT
        </Link>
      </section>
    </div>
  );
}
