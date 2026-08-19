const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST")
    return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers: cors });
  try {
    const { membership_public_id, provider } = await request.json();
    if (!membership_public_id || !["apple", "google"].includes(provider)) {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400, headers: cors });
    }
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key)
      return Response.json({ error: "SERVER_CONFIGURATION" }, { status: 500, headers: cors });
    const response = await fetch(`${url}/rest/v1/rpc/get_wallet_install_state`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ _membership_public_id: membership_public_id, _provider: provider }),
    });
    const body = await response.json();
    return Response.json(body, {
      status: response.status,
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400, headers: cors });
  }
});
