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
        html: `
          <h1>Nueva solicitud de demo</h1>
          <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p><strong>Negocio:</strong> ${escapeHtml(business)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(phone || "No indicado")}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${escapeHtml(message || "Sin mensaje adicional.").replaceAll("\n", "<br>")}</p>
        `,
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
