const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const stripeRequest = async (path: string, secretKey: string, body: URLSearchParams) => {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2026-07-29.dahlia",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Stripe no pudo abrir el portal");
  return result;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = (Deno.env.get("APP_URL") || "https://fideleo.store").replace(/\/$/, "");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceKey || !stripeSecretKey || !authorization) {
      return json({ error: "La gestión de la suscripción no está disponible" }, 503);
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: "Sesión no válida" }, 401);
    const user = await userResponse.json();
    const dbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const membershipResponse = await fetch(
      `${supabaseUrl}/rest/v1/organization_users?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&role=eq.admin&select=organization_id&limit=1`,
      { headers: dbHeaders },
    );
    const membership = (await membershipResponse.json())[0];
    if (!membership) return json({ error: "Solo un administrador puede gestionar el plan" }, 403);

    const organizationResponse = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(membership.organization_id)}&select=stripe_customer_id,stripe_subscription_id&limit=1`,
      { headers: dbHeaders },
    );
    const organization = (await organizationResponse.json())[0];
    if (!organization?.stripe_customer_id || !organization?.stripe_subscription_id) {
      return json({ error: "La suscripción no está vinculada correctamente con Stripe" }, 409);
    }

    const payload = await request.json().catch(() => ({}));
    const params = new URLSearchParams();
    params.set("customer", organization.stripe_customer_id);
    params.set("return_url", `${appUrl}/panel/suscripcion`);
    params.set("locale", "es");
    if (payload.action === "cancel") {
      params.set("flow_data[type]", "subscription_cancel");
      params.set(
        "flow_data[subscription_cancel][subscription]",
        organization.stripe_subscription_id,
      );
      params.set("flow_data[after_completion][type]", "redirect");
      params.set(
        "flow_data[after_completion][redirect][return_url]",
        `${appUrl}/panel/suscripcion?subscription=updated`,
      );
    }

    const portal = await stripeRequest("/v1/billing_portal/sessions", stripeSecretKey, params);
    return json({ url: portal.url });
  } catch (error) {
    console.error("create-billing-portal", error instanceof Error ? error.message : error);
    return json(
      { error: error instanceof Error ? error.message : "No se pudo abrir la suscripción" },
      500,
    );
  }
});
