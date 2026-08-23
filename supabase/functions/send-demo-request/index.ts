const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const payload = await request.json();
    const name = clean(payload.name, 100);
    const business = clean(payload.business, 120);
    const email = clean(payload.email, 254).toLowerCase();
    const phone = clean(payload.phone, 40);
    const message = clean(payload.message, 2_000);
    const website = clean(payload.website, 200);

    // Los bots suelen completar este campo oculto. Respondemos correctamente sin enviar nada.
    if (website) return json({ ok: true });
    if (name.length < 2 || business.length < 2) {
      return json({ error: "Completa el nombre y el negocio" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Introduce un email válido" }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!resendApiKey || !fromEmail || !supabaseUrl || !serviceKey) {
      throw new Error("El servicio de email todavía no está configurado");
    }

    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientIp = forwardedFor || request.headers.get("cf-connecting-ip") || "unknown";
    const [ipHash, emailHash] = await Promise.all([hash(`ip:${clientIp}`), hash(`email:${email}`)]);
    const since = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
    const databaseHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "count=exact",
    };
    const countRequests = async (keyHash: string) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/email_rate_limits?key_hash=eq.${keyHash}&created_at=gte.${encodeURIComponent(since)}&select=id`,
        { method: "HEAD", headers: databaseHeaders },
      );
      if (!response.ok) throw new Error("No se pudo validar el límite de envío");
      return Number(response.headers.get("content-range")?.split("/")[1] || 0);
    };
    const [ipCount, emailCount] = await Promise.all([
      countRequests(ipHash),
      countRequests(emailHash),
    ]);
    if (ipCount >= 5 || emailCount >= 3) {
      return json({ error: "Has realizado demasiados envíos. Inténtalo más tarde." }, 429);
    }
    const rateResponse = await fetch(`${supabaseUrl}/rest/v1/email_rate_limits`, {
      method: "POST",
      headers: databaseHeaders,
      body: JSON.stringify([{ key_hash: ipHash }, { key_hash: emailHash }]),
    });
    if (!rateResponse.ok) throw new Error("No se pudo registrar el límite de envío");

    const subject = `Solicitud de demo · ${business}`;
    const text = [
      `Nombre: ${name}`,
      `Negocio: ${business}`,
      `Email: ${email}`,
      `Teléfono: ${phone || "No indicado"}`,
      "",
      message || "Sin mensaje adicional.",
    ].join("\n");
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Fideleo/1.0",
        "Idempotency-Key": `demo-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ["Fideleo.app@gmail.com"],
        reply_to: email,
        subject,
        text,
        html: `<!doctype html>
          <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
          <body style="margin:0;background:#f5f5f2;font-family:Manrope,Inter,Arial,sans-serif;color:#111111">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f2"><tr><td align="center" style="padding:36px 16px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px">
                <tr><td style="border:1px solid #111111;border-bottom:0;border-radius:28px 28px 0 0;background:#f8b9e7;padding:28px 34px">
                  <img src="https://www.fideleo.store/logo.svg" width="168" height="38" alt="Fideleo" style="display:block;width:168px;height:auto;border:0" />
                </td></tr>
                <tr><td style="border:1px solid #111111;border-radius:0 0 28px 28px;background:#ffffff;padding:38px 34px">
                  <p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">Solicitud de demo</p>
                  <h1 style="margin:0 0 28px;font-size:32px;line-height:1.15;letter-spacing:-1px">Nuevo contacto comercial</h1>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 8px">
                    <tr><td style="width:110px;color:#666;font-size:14px">Nombre</td><td style="font-size:15px;font-weight:700">${escapeHtml(name)}</td></tr>
                    <tr><td style="color:#666;font-size:14px">Negocio</td><td style="font-size:15px;font-weight:700">${escapeHtml(business)}</td></tr>
                    <tr><td style="color:#666;font-size:14px">Email</td><td style="font-size:15px;font-weight:700">${escapeHtml(email)}</td></tr>
                    <tr><td style="color:#666;font-size:14px">Teléfono</td><td style="font-size:15px;font-weight:700">${escapeHtml(phone || "No indicado")}</td></tr>
                  </table>
                  <div style="margin-top:24px;border-radius:18px;background:#dff7ff;padding:20px">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Mensaje</p>
                    <p style="margin:0;color:#333;font-size:15px;line-height:1.65">${escapeHtml(message || "Sin mensaje adicional.").replaceAll("\n", "<br>")}</p>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 6px 0;color:#6c6c6c;font-size:12px">© ${new Date().getUTCFullYear()} Fideleo</td></tr>
              </table>
            </td></tr></table>
          </body></html>`,
      }),
    });
    const result = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("Resend error", emailResponse.status, result);
      throw new Error("No se pudo entregar el email");
    }
    return json({ ok: true, id: result.id });
  } catch (error) {
    console.error("send-demo-request", error);
    return json(
      { error: error instanceof Error ? error.message : "No se pudo enviar la solicitud" },
      500,
    );
  }
});
