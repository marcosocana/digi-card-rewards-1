const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const catalog = {
  "qr-table": {
    name: "Expositor QR de mesa",
    description: "Soporte rígido personalizado para mesas y barra.",
    unitAmount: 1990,
  },
  "qr-sticker": {
    name: "Pack de adhesivos QR",
    description: "Pack de 10 adhesivos resistentes con el QR del establecimiento.",
    unitAmount: 1250,
  },
  counter: {
    name: "Cartel de mostrador",
    description: "Cartel personalizado con marca y llamada a la acción.",
    unitAmount: 2490,
  },
  cards: {
    name: "Tarjetas informativas",
    description: "Pack de 100 tarjetas informativas personalizadas.",
    unitAmount: 2990,
  },
  staff: {
    name: "Kit para el equipo",
    description: "Materiales para explicar el club y agilizar el registro.",
    unitAmount: 3990,
  },
  window: {
    name: "Vinilo de escaparate",
    description: "Vinilo removible personalizado para el escaparate.",
    unitAmount: 3490,
  },
} as const;

type CatalogId = keyof typeof catalog;

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
      return json({ error: "Los pedidos no están disponibles" }, 503);
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!userResponse.ok) return json({ error: "Sesión no válida" }, 401);
    const user = await userResponse.json();
    const dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const membershipResponse = await fetch(
      `${supabaseUrl}/rest/v1/organization_users?user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=organization_id,role&limit=1`,
      { headers: dbHeaders },
    );
    const membership = (await membershipResponse.json())[0];
    if (!membership || !["admin", "manager"].includes(membership.role)) {
      return json({ error: "No tienes permiso para realizar pedidos" }, 403);
    }

    const organizationResponse = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(membership.organization_id)}&select=id,display_name,stripe_customer_id&limit=1`,
      { headers: dbHeaders },
    );
    const organization = (await organizationResponse.json())[0];
    if (!organization) return json({ error: "Organización no encontrada" }, 404);

    const payload = await request.json();
    const submittedItems = Array.isArray(payload.items) ? payload.items : [];
    const items = submittedItems
      .map((item: { id?: unknown; quantity?: unknown }) => ({
        id: typeof item.id === "string" ? item.id : "",
        quantity: Number.isInteger(item.quantity) ? Number(item.quantity) : 0,
      }))
      .filter(
        (item: { id: string; quantity: number }) =>
          item.id in catalog && item.quantity >= 1 && item.quantity <= 99,
      ) as { id: CatalogId; quantity: number }[];
    if (!items.length || items.length !== submittedItems.length) {
      return json({ error: "El pedido contiene artículos o cantidades no válidos" }, 400);
    }

    let customerId = organization.stripe_customer_id as string | null;
    if (!customerId) {
      const customerParams = new URLSearchParams();
      customerParams.set("email", user.email || "");
      customerParams.set("name", organization.display_name);
      customerParams.set("metadata[organization_id]", organization.id);
      const customerResponse = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Stripe-Version": "2026-07-29.dahlia",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: customerParams,
      });
      const customer = await customerResponse.json();
      if (!customerResponse.ok)
        throw new Error(customer?.error?.message || "No se pudo crear el cliente");
      customerId = customer.id;
      await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${organization.id}`, {
        method: "PATCH",
        headers: dbHeaders,
        body: JSON.stringify({ stripe_customer_id: customerId }),
      });
    }

    const orderId = crypto.randomUUID();
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("customer", customerId!);
    params.set("client_reference_id", orderId);
    params.set("locale", "es");
    params.set("billing_address_collection", "required");
    params.set("shipping_address_collection[allowed_countries][0]", "ES");
    params.set("phone_number_collection[enabled]", "true");
    params.set("invoice_creation[enabled]", "true");
    params.set("allow_promotion_codes", "true");
    params.set(
      "success_url",
      `${appUrl}/panel/tienda?order=success&session_id={CHECKOUT_SESSION_ID}`,
    );
    params.set("cancel_url", `${appUrl}/panel/tienda?order=cancelled`);
    params.set("metadata[organization_id]", organization.id);
    params.set("metadata[order_id]", orderId);
    params.set(
      "metadata[order_summary]",
      items
        .map((item) => `${item.quantity}x ${catalog[item.id].name}`)
        .join(" · ")
        .slice(0, 500),
    );
    params.set(
      "integration_identifier",
      `fideleo_store_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`,
    );
    items.forEach((item, index) => {
      const product = catalog[item.id];
      params.set(`line_items[${index}][price_data][currency]`, "eur");
      params.set(`line_items[${index}][price_data][unit_amount]`, String(product.unitAmount));
      params.set(`line_items[${index}][price_data][product_data][name]`, product.name);
      params.set(
        `line_items[${index}][price_data][product_data][description]`,
        product.description,
      );
      params.set(`line_items[${index}][quantity]`, String(item.quantity));
    });

    const checkoutResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Stripe-Version": "2026-07-29.dahlia",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const checkout = await checkoutResponse.json();
    if (!checkoutResponse.ok) {
      throw new Error(checkout?.error?.message || "Stripe no pudo preparar el pedido");
    }
    return json({ url: checkout.url, orderId });
  } catch (error) {
    console.error("create-store-checkout", error instanceof Error ? error.message : error);
    return json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar el pedido" },
      500,
    );
  }
});
