const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const safeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const verifySignature = async (body: string, header: string, secret: string) => {
  const parts = header.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`)),
  );
  return signatures.some((signature) => safeEqual(signature, expected));
};

const allowedStatuses = new Set([
  "none",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

type StripeSubscription = {
  id: string;
  status: string;
  customer?: string | { id?: string };
  current_period_end?: number;
  metadata?: { organization_id?: string; plan_code?: string };
  items?: { data?: Array<{ current_period_end?: number; price?: { id?: string } }> };
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const rawBody = await request.text();

  try {
    const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const signature = request.headers.get("stripe-signature") || "";
    if (!signingSecret || !stripeSecretKey || !supabaseUrl || !serviceKey) {
      return json({ error: "Webhook no configurado" }, 503);
    }
    if (!(await verifySignature(rawBody, signature, signingSecret))) {
      return json({ error: "Firma no válida" }, 400);
    }

    const event = JSON.parse(rawBody);
    const databaseHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const processedResponse = await fetch(
      `${supabaseUrl}/rest/v1/stripe_webhook_events?id=eq.${encodeURIComponent(event.id)}&select=id&limit=1`,
      { headers: databaseHeaders },
    );
    const processed = await processedResponse.json();
    if (processed[0]) return json({ received: true, duplicate: true });

    const fetchSubscription = async (subscriptionId: string) => {
      const response = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price`,
        {
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
            "Stripe-Version": "2026-07-29.dahlia",
          },
        },
      );
      if (!response.ok) throw new Error("No se pudo verificar la suscripción en Stripe");
      return response.json();
    };

    const planFromPrice = (priceId: string | undefined) => {
      const prices: Record<string, string | undefined> = {
        basic: Deno.env.get("STRIPE_BASIC_PRICE_ID"),
        pro: Deno.env.get("STRIPE_PRO_PRICE_ID"),
        ultra: Deno.env.get("STRIPE_ULTRA_PRICE_ID"),
      };
      return Object.entries(prices).find(([, configured]) => configured === priceId)?.[0] || null;
    };

    const syncSubscription = async (
      subscription: StripeSubscription,
      organizationHint?: string,
    ) => {
      const organizationId = subscription.metadata?.organization_id || organizationHint;
      if (!organizationId) throw new Error("La suscripción no identifica la organización");
      const status = allowedStatuses.has(subscription.status) ? subscription.status : "none";
      const firstItem = subscription.items?.data?.[0];
      const planCode = planFromPrice(firstItem?.price?.id) || subscription.metadata?.plan_code;
      const periodEnd = firstItem?.current_period_end || subscription.current_period_end;
      const response = await fetch(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}`,
        {
          method: "PATCH",
          headers: databaseHeaders,
          body: JSON.stringify({
            stripe_customer_id:
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id,
            stripe_subscription_id: subscription.id,
            subscription_status: status,
            plan_code: planCode,
            subscription_current_period_end: periodEnd
              ? new Date(Number(periodEnd) * 1000).toISOString()
              : null,
            subscription_updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!response.ok) throw new Error("No se pudo actualizar el acceso de la organización");
    };

    const object = event.data?.object;
    if (event.type === "checkout.session.completed" && object?.subscription) {
      const subscription = await fetchSubscription(
        typeof object.subscription === "string" ? object.subscription : object.subscription.id,
      );
      await syncSubscription(
        subscription,
        object.metadata?.organization_id || object.client_reference_id,
      );
    } else if (event.type?.startsWith("customer.subscription.")) {
      await syncSubscription(object);
    } else if (
      ["invoice.paid", "invoice.payment_failed"].includes(event.type) &&
      (object?.subscription || object?.parent?.subscription_details?.subscription)
    ) {
      const subscriptionValue =
        object.subscription || object.parent.subscription_details.subscription;
      const subscription = await fetchSubscription(
        typeof subscriptionValue === "string" ? subscriptionValue : subscriptionValue.id,
      );
      await syncSubscription(subscription);
    }

    const stored = await fetch(`${supabaseUrl}/rest/v1/stripe_webhook_events`, {
      method: "POST",
      headers: databaseHeaders,
      body: JSON.stringify({ id: event.id, event_type: event.type }),
    });
    if (!stored.ok && stored.status !== 409) throw new Error("No se pudo registrar el webhook");
    return json({ received: true });
  } catch (error) {
    console.error("stripe-webhook", error instanceof Error ? error.message : error);
    return json({ error: "No se pudo procesar el webhook" }, 500);
  }
});
