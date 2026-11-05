// Validación y mensajes de error de la autenticación (SPEC 11). TS puro: sin React ni DOM.
export const USERNAME_RE = /^[A-Z0-9_]{3,10}$/;
export const PASSWORD_MIN = 8;
// Email práctico: parte local, "@", dominio con punto y TLD de 2+ letras (SPEC 12).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
// Contraseña: 8 o más caracteres, sin reglas de composición (SPEC 12).
export const PASSWORD_RE = /^.{8,}$/;
export type FieldErrors = Partial<
  Record<"username" | "email" | "password", string>
>;
/** El username se guarda y se muestra en mayúsculas y sin espacios en los extremos. */
export function normalizeUsername(value: string): string {
  return value.trim().toUpperCase();
}
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
function validateEmail(email: string): string | undefined {
  if (!email) return "Escribe tu correo electrónico.";
  if (!EMAIL_RE.test(email)) return "El correo no es válido.";
}
export function validateSignIn(input: {
  email: string;
  password: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const emailError = validateEmail(normalizeEmail(input.email));
  if (emailError) errors.email = emailError;
  if (!input.password) {
    errors.password = "Escribe tu contraseña.";
  } else if (!PASSWORD_RE.test(input.password)) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  return errors;
}
export function validateSignUp(input: {
  username: string;
  email: string;
  password: string;
}): FieldErrors {
  const errors = validateSignIn(input);
  const username = normalizeUsername(input.username);
  if (!username) {
    errors.username = "Elige un nombre de usuario.";
  } else if (!USERNAME_RE.test(username)) {
    errors.username =
      "De 3 a 10 caracteres: letras sin tilde, números o guion bajo.";
  }
  return errors;
}
/** Traduce un error de Supabase Auth a un mensaje en español. */
export function authErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo.";
    case "weak_password":
      return `La contraseña es demasiado débil (mínimo ${PASSWORD_MIN} caracteres).`;
    case "over_email_send_rate_limit":
      return "Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "signup_disabled":
      return "Los registros están desactivados por ahora.";
    case "provider_disabled":
      return "Este método de acceso aún no está disponible.";
  }
  if (error.message?.includes("Database error saving new user")) {
    return "No se pudo crear la cuenta. Prueba otro usuario.";
  }
  return "Algo salió mal. Inténtalo de nuevo.";
}
