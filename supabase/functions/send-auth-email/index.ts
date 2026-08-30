import { Webhook } from "npm:standardwebhooks@1.0.0";

type HookPayload = {
  user: {
    email?: string;
    new_email?: string;
    user_metadata?: { full_name?: string; name?: string };
  };
  email_data: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
  };
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const actionContent = (action: string) => {
  if (action === "recovery") {
    return {
      subject: "Recupera tu contraseña de Fideleo",
      eyebrow: "Recuperación de cuenta",
      title: "Crea una nueva contraseña",
      message: "Usa el botón para continuar de forma segura.",
      button: "Cambiar mi contraseña",
    };
  }
  if (action === "invite") {
    return {
      subject: "Te han invitado a Fideleo",
      eyebrow: "Invitación",
      title: "Crea tu contraseña y accede",
      message:
        "Acepta la invitación, elige una contraseña y activa tu acceso al equipo de Fideleo.",
      button: "Crear mi contraseña",
    };
  }
  if (action === "email_change") {
    return {
      subject: "Confirma tu nuevo email de Fideleo",
      eyebrow: "Cambio de email",
      title: "Confirma tu email",
      message: "Introduce el código o utiliza el botón para confirmar el cambio.",
      button: "Confirmar email",
    };
  }
  return {
    subject: "Tu código de verificación de Fideleo",
    eyebrow: "Verificación de cuenta",
    title: "Verifica tu email",
    message: "Introduce este código de seis cifras en la pantalla de registro:",
    button: "Verificar mi email",
  };
};

const emailHtml = ({
  name,
  token,
  verifyUrl,
  action,
}: {
  name: string;
  token: string;
  verifyUrl: string;
  action: string;
}) => {
  const content = actionContent(action);
  const showActionLink = action !== "signup";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;background:#f5f5f2;font-family:Manrope,Inter,Arial,sans-serif;color:#111111">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.message)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f2"><tr><td align="center" style="padding:36px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px">
      <tr><td style="border:1px solid #111111;border-bottom:0;border-radius:28px 28px 0 0;background:#f8b9e7;padding:28px 34px;color:#111111;font-size:24px;font-weight:800;letter-spacing:-.04em">
        Fideleo
      </td></tr>
      <tr><td style="border:1px solid #111111;border-radius:0 0 28px 28px;background:#ffffff;padding:38px 34px">
        <p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(content.eyebrow)}</p>
        <h1 style="margin:0 0 24px;font-size:32px;line-height:1.15;letter-spacing:-1px">${escapeHtml(content.title)}</h1>
        <p style="margin:0 0 16px;color:#363636;font-size:16px;line-height:1.65">Hola${name ? `, ${escapeHtml(name)}` : ""}. ${escapeHtml(content.message)}</p>
        ${
          token
            ? `<div style="margin:28px 0;border:1px solid #111111;border-radius:18px;background:#f5f5f2;padding:22px;text-align:center"><p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:800;letter-spacing:.18em">${escapeHtml(token)}</p></div>`
            : ""
        }
        ${
          showActionLink
            ? `<div style="margin:28px 0"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;border-radius:999px;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 25px">${escapeHtml(content.button)}</a></div>`
            : ""
        }
        <p style="margin:24px 0 0;border-radius:16px;background:#dff7ff;padding:16px;color:#3e3e3e;font-size:13px;line-height:1.55">Si no has solicitado este correo, puedes ignorarlo.</p>
      </td></tr>
      <tr><td style="padding:20px 6px 0;color:#6c6c6c;font-size:12px;line-height:1.5">© ${new Date().getUTCFullYear()} Fideleo · Correo transaccional enviado mediante Resend.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Método no permitido", { status: 405 });

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!resendApiKey || !fromEmail || !hookSecret || !supabaseUrl) {
    return Response.json(
      { error: { http_code: 500, message: "Email hook no configurado" } },
      { status: 500 },
    );
  }

  try {
    const body = await request.text();
    const webhook = new Webhook(hookSecret.replace("v1,whsec_", ""));
    const payload = webhook.verify(body, Object.fromEntries(request.headers)) as HookPayload;
    const action = payload.email_data.email_action_type || "signup";
    const recipient = (payload.user.email || "").trim().toLowerCase();
    const token = payload.email_data.token || payload.email_data.token_new || "";
    const tokenHash = payload.email_data.token_hash || payload.email_data.token_hash_new || "";
    const redirectTo = payload.email_data.redirect_to || "https://www.fideleo.store/auth";
    if (!recipient || !tokenHash)
      throw new Error("El evento de Auth no contiene destinatario o token");

    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(action)}&redirect_to=${encodeURIComponent(redirectTo)}`;
    const content = actionContent(action);
    const name = payload.user.user_metadata?.full_name || payload.user.user_metadata?.name || "";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Fideleo/1.0",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        reply_to: "fideleo.app@gmail.com",
        subject: content.subject,
        html: emailHtml({ name, token, verifyUrl, action }),
        text: `${content.title}\n\n${content.message}${token ? `\n\nCódigo: ${token}` : ""}${action !== "signup" ? `\n\n${content.button}: ${verifyUrl}` : ""}`,
        tags: [{ name: "category", value: `auth_${action.replaceAll(/[^a-z0-9_]/gi, "_")}` }],
      }),
    });

    if (!resendResponse.ok) {
      console.error(
        "Resend auth email failed",
        resendResponse.status,
        (await resendResponse.text()).slice(0, 300),
      );
      throw new Error("Resend no ha aceptado el correo de autenticación");
    }
    const resend = await resendResponse.json();
    console.log("Auth email sent", JSON.stringify({ action, resendId: resend.id }));
    return Response.json({});
  } catch (error) {
    console.error("send-auth-email", error instanceof Error ? error.message : error);
    return Response.json(
      { error: { http_code: 401, message: "No se pudo enviar el correo de autenticación" } },
      { status: 401 },
    );
  }
});
