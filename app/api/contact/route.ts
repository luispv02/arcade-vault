import { Resend } from "resend";
import {
  validateContact,
  type ContactResponse,
} from "@/lib/contact";

const GENERIC_ERROR =
  "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.";

function respond(body: ContactResponse, status: number) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ ok: false, error: "Datos de contacto inválidos." }, 400);
  }

  const result = validateContact(body);
  if (!result.ok) {
    return respond({ ok: false, error: result.error }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("[contact] Falta RESEND_API_KEY o CONTACT_TO_EMAIL");
    return respond({ ok: false, error: GENERIC_ERROR }, 500);
  }

  const { name, email, msg } = result.data;
  // Sin saltos de línea en el asunto para evitar inyección de cabeceras.
  const subjectName = name.replace(/[\r\n]+/g, " ").trim();

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to,
      replyTo: email,
      subject: `Contacto Arcade Vault — ${subjectName}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });
    if (error) {
      // El detalle interno solo va al log del servidor, nunca al cliente.
      console.error("[contact] Resend rechazó el envío:", error.name);
      return respond({ ok: false, error: GENERIC_ERROR }, 500);
    }
  } catch {
    console.error("[contact] Fallo inesperado al enviar con Resend");
    return respond({ ok: false, error: GENERIC_ERROR }, 500);
  }

  return respond({ ok: true }, 200);
}
