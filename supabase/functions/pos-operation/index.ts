const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-fideleo-key",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") {
    return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405, headers: cors });
  }

  try {
    const apiKey = request.headers.get("x-fideleo-key");
    const { external_id, operation_type, payload = {} } = await request.json();
    if (!apiKey || !external_id || !operation_type) {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400, headers: cors });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) {
      return Response.json({ error: "SERVER_CONFIGURATION" }, { status: 500, headers: cors });
    }

    const response = await fetch(`${url}/rest/v1/rpc/ingest_pos_operation`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _api_key: apiKey,
        _external_id: external_id,
        _operation_type: operation_type,
        _payload: payload,
      }),
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
