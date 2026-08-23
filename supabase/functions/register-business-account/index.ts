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

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const allowedRedirect = (value: string, fallback: string) => {
  try {
    const url = new URL(value);
    const isProduction =
      url.protocol === "https:" &&
      ["fideleo.store", "www.fideleo.store", "fideleovdos.vercel.app"].includes(url.hostname);
    const isLocal =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      ["3000", "8080", "5173"].includes(url.port);
    return isProduction || isLocal ? url.toString() : fallback;
  } catch {
    return fallback;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl = (Deno.env.get("APP_URL") || "https://fideleo.store").replace(/\/$/, "");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ ok: false, error: "El registro no está configurado" }, 503);
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const email = clean(payload.email, 254).toLowerCase();
    const password = clean(payload.password, 128);
    const fullName = clean(payload.fullName, 120);
    const businessName = clean(payload.businessName, 160);
    const redirectTo = allowedRedirect(
      clean(payload.redirectTo, 500),
      `${appUrl}/auth?confirmed=1`,
    );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, code: "invalid_email", error: "Introduce un email válido" });
    }
    if (password.length < 8) {
      return json({
        ok: false,
        code: "weak_password",
        error: "La contraseña debe tener al menos 8 caracteres",
      });
    }
    if (!fullName || !businessName) {
      return json({ ok: false, code: "missing_fields", error: "Completa todos los campos" });
    }

    const databaseHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateKey = await sha256(`registration:${email}:${forwardedFor}`);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const attemptsResponse = await fetch(
      `${supabaseUrl}/rest/v1/email_rate_limits?key_hash=eq.${rateKey}&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: databaseHeaders },
    );
    const attempts = await attemptsResponse.json();
    if (Array.isArray(attempts) && attempts.length >= 8) {
      return json(
        {
          ok: false,
          code: "rate_limited",
          error: "Demasiados intentos. Prueba de nuevo más tarde.",
        },
        429,
      );
    }
    await fetch(`${supabaseUrl}/rest/v1/email_rate_limits`, {
      method: "POST",
      headers: databaseHeaders,
      body: JSON.stringify({ key_hash: rateKey }),
    });

    const existsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/registration_email_exists`, {
      method: "POST",
      headers: databaseHeaders,
      body: JSON.stringify({ _email: email }),
    });
    if (!existsResponse.ok) throw new Error("No se pudo comprobar la cuenta");
    if ((await existsResponse.json()) === true) {
      return json({ ok: false, code: "account_exists" });
    }

    const signupResponse = await fetch(
      `${supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          data: { full_name: fullName, business_name: businessName },
        }),
      },
    );
    const signup = await signupResponse.json();
    if (!signupResponse.ok) {
      if (
        signup?.code === "user_already_exists" ||
        signup?.msg?.toLowerCase().includes("registered")
      ) {
        return json({ ok: false, code: "account_exists" });
      }
      console.error(
        "Auth signup failed",
        signupResponse.status,
        signup?.code || signup?.error_code,
      );
      return json({
        ok: false,
        error: signup?.msg || signup?.message || "No se pudo crear la cuenta",
      });
    }

    return json({ ok: true, emailSent: true });
  } catch (error) {
    console.error("register-business-account", error instanceof Error ? error.message : error);
    return json({ ok: false, error: "No se pudo crear la cuenta" }, 500);
  }
});
