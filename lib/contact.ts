// Compartido por el formulario (cliente) y el Route Handler (servidor).
export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: string }; // mensaje legible para mostrar en pantalla

// Formato básico: algo@dominio.tld, sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(
  input: unknown,
): { ok: true; data: ContactPayload } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Datos de contacto inválidos." };
  }

  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const msg = typeof raw.msg === "string" ? raw.msg.trim() : "";

  if (!name || !email || !msg) {
    return { ok: false, error: "Completa nombre, correo y mensaje." };
  }
  if (name.length > CONTACT_LIMITS.name) {
    return {
      ok: false,
      error: `El nombre no puede superar ${CONTACT_LIMITS.name} caracteres.`,
    };
  }
  if (email.length > CONTACT_LIMITS.email) {
    return {
      ok: false,
      error: `El correo no puede superar ${CONTACT_LIMITS.email} caracteres.`,
    };
  }
  if (msg.length > CONTACT_LIMITS.msg) {
    return {
      ok: false,
      error: `El mensaje no puede superar ${CONTACT_LIMITS.msg} caracteres.`,
    };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Introduce un correo electrónico válido." };
  }

  return { ok: true, data: { name, email, msg } };
}
