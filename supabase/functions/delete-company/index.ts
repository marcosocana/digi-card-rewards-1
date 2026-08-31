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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const authorization = request.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) {
    return json({ ok: false, error: "La eliminación no está configurada" }, 503);
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const organizationId = clean(payload.organizationId, 36);
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) {
      return json({ ok: false, error: "Empresa no válida" }, 400);
    }

    const callerResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!callerResponse.ok) return json({ ok: false, error: "Sesión no válida" }, 401);
    const caller = (await callerResponse.json()) as { id?: string };
    if (!caller.id) return json({ ok: false, error: "Sesión no válida" }, 401);

    const serviceHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(caller.id)}&platform_role=eq.superadmin&select=id&limit=1`,
      { headers: serviceHeaders },
    );
    const profiles = profileResponse.ok ? await profileResponse.json() : [];
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return json({ ok: false, error: "Solo el modo dios puede eliminar empresas" }, 403);
    }

    const organizationResponse = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}&select=display_name,stripe_subscription_id&limit=1`,
      { headers: serviceHeaders },
    );
    const organizations = organizationResponse.ok ? await organizationResponse.json() : [];
    const organization = Array.isArray(organizations) ? organizations[0] : null;
    if (!organization) return json({ ok: false, error: "La empresa no existe" }, 404);

    if (organization.stripe_subscription_id) {
      if (!stripeKey) {
        return json(
          { ok: false, error: "No se puede cancelar la suscripción de esta empresa" },
          503,
        );
      }
      const stripeResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(organization.stripe_subscription_id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${stripeKey}` },
        },
      );
      if (!stripeResponse.ok && stripeResponse.status !== 404) {
        return json({ ok: false, error: "Stripe no ha podido cancelar la suscripción" }, 502);
      }
    }

    const listResponse = await fetch(`${supabaseUrl}/storage/v1/object/list/brand-assets`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ prefix: organizationId, limit: 1000, offset: 0 }),
    });
    if (!listResponse.ok) {
      return json({ ok: false, error: "No se pudieron consultar los archivos de la empresa" }, 502);
    }
    const assets = (await listResponse.json()) as Array<{ name?: string }>;
    const prefixes = assets
      .map((asset) => asset.name)
      .filter((name): name is string => Boolean(name))
      .map((name) => `${organizationId}/${name}`);
    if (prefixes.length) {
      const removeResponse = await fetch(`${supabaseUrl}/storage/v1/object/brand-assets`, {
        method: "DELETE",
        headers: serviceHeaders,
        body: JSON.stringify({ prefixes }),
      });
      if (!removeResponse.ok) {
        return json(
          { ok: false, error: "No se pudieron eliminar los archivos de la empresa" },
          502,
        );
      }
    }

    const purgeResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/purge_organization`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _organization_id: organizationId }),
    });
    const result = await purgeResponse.json();
    if (!purgeResponse.ok) {
      console.error("purge_organization", purgeResponse.status, result);
      return json({ ok: false, error: result?.message || "No se pudo eliminar la empresa" }, 500);
    }

    return json({ ok: true, ...result });
  } catch (error) {
    console.error("delete-company", error instanceof Error ? error.message : error);
    return json({ ok: false, error: "No se pudo completar la eliminación" }, 500);
  }
});
