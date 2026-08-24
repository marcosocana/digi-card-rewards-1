const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const stripeRequest = async (path: string, secretKey: string, init: RequestInit = {}) => {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2026-07-29.dahlia",
      ...init.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) {
    console.error("Stripe request failed", response.status, body?.error?.type);
    throw new Error(body?.error?.message || "Stripe no ha podido iniciar el pago");
  }
  return body;
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

    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
      return json({ error: "Sesión no válida" }, 401);
    }
    if (!stripeSecretKey) {
      return json({ error: "Los pagos todavía no están configurados" }, 503);
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: "Sesión no válida" }, 401);
    const user = await userResponse.json();

    const payload = await request.json();
    const planCode = typeof payload.planCode === "string" ? payload.planCode.toLowerCase() : "";
    const priceIds: Record<string, string | undefined> = {
      basic: Deno.env.get("STRIPE_BASIC_PRICE_ID"),
      pro: Deno.env.get("STRIPE_PRO_PRICE_ID"),
      ultra: Deno.env.get("STRIPE_ULTRA_PRICE_ID"),
    };
    const priceId = priceIds[planCode];
    if (!priceId) return json({ error: "Este plan todavía no está disponible para compra" }, 400);

    const databaseHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const membershipsResponse = await fetch(
      `${supabaseUrl}/rest/v1/organization_users?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=organization_id,role&limit=1`,
      { headers: databaseHeaders },
    );
    const memberships = await membershipsResponse.json();
    const membership = memberships[0];
    if (!membership) return json({ error: "La cuenta no tiene una organización asociada" }, 409);
    if (membership.role !== "admin") {
      return json({ error: "Solo un administrador puede contratar el plan" }, 403);
    }

    const organizationsResponse = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(membership.organization_id)}&select=id,display_name,stripe_customer_id,subscription_status&limit=1`,
      { headers: databaseHeaders },
    );
    const organizations = await organizationsResponse.json();
    const organization = organizations[0];
    if (!organization) return json({ error: "Organización no encontrada" }, 404);
    if (["active", "trialing"].includes(organization.subscription_status)) {
      return json({ error: "La organización ya tiene un plan activo" }, 409);
    }

    let customerId = organization.stripe_customer_id as string | null;
    if (!customerId) {
      const customerParams = new URLSearchParams();
      customerParams.set("email", user.email || "");
      customerParams.set("name", organization.display_name);
      customerParams.set("metadata[organization_id]", organization.id);
      const customer = await stripeRequest("/v1/customers", stripeSecretKey, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: customerParams,
      });
      customerId = customer.id;
      await fetch(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organization.id)}`,
        {
          method: "PATCH",
          headers: databaseHeaders,
          body: JSON.stringify({
            stripe_customer_id: customerId,
            subscription_updated_at: new Date().toISOString(),
          }),
        },
      );
    }

    const checkoutParams = new URLSearchParams();
    checkoutParams.set("mode", "subscription");
    checkoutParams.set("customer", customerId!);
    checkoutParams.set("client_reference_id", organization.id);
    checkoutParams.set("line_items[0][price]", priceId);
    checkoutParams.set("line_items[0][quantity]", "1");
    checkoutParams.set(
      "success_url",
      `${appUrl}/panel?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    );
    checkoutParams.set("cancel_url", `${appUrl}/panel?checkout=cancelled`);
    checkoutParams.set("locale", "es");
    checkoutParams.set("allow_promotion_codes", "true");
    checkoutParams.set("metadata[organization_id]", organization.id);
    checkoutParams.set("metadata[plan_code]", planCode);
    checkoutParams.set("subscription_data[metadata][organization_id]", organization.id);
    checkoutParams.set("subscription_data[metadata][plan_code]", planCode);
    checkoutParams.set(
      "integration_identifier",
      `fideleo_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`,
    );

    const checkout = await stripeRequest("/v1/checkout/sessions", stripeSecretKey, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: checkoutParams,
    });
    return json({ url: checkout.url });
  } catch (error) {
    console.error("create-checkout-session", error instanceof Error ? error.message : error);
    return json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar el pago" },
      500,
    );
  }
});
