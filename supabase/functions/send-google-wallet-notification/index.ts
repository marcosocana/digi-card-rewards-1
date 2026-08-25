const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const importPrivateKey = async (pem: string) => {
  const clean = pem.replace(
    /-----\s*BEGIN PRIVATE KEY\s*-----|-----\s*END PRIVATE KEY\s*-----|\n|\r/g,
    "",
  );
  const bytes = Uint8Array.from(atob(clean), (character) => character.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
};

const signJwt = async (payload: Record<string, unknown>, privateKey: CryptoKey) => {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
};

const getGoogleAccessToken = async (credentials: { client_email: string; private_key: string }) => {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    await importPrivateKey(credentials.private_key),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.error ?? "GOOGLE_AUTH_FAILED");
  }
  return body.access_token as string;
};

const readGoogleCredentials = () => {
  const raw =
    Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON") ??
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const encoded = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64");
  if (!raw && !encoded) return null;
  try {
    const credentials = JSON.parse(raw ?? atob(encoded!)) as {
      client_email?: string;
      private_key?: string;
    };
    return credentials.client_email && credentials.private_key
      ? (credentials as { client_email: string; private_key: string })
      : null;
  } catch {
    return null;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = request.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const credentials = readGoogleCredentials();
    if (!authorization) return json({ error: "UNAUTHORIZED" }, 401);
    if (!supabaseUrl || !anonKey || !serviceKey || !credentials) {
      return json({ error: "SERVER_CONFIGURATION" }, 500);
    }

    const { notificationId } = (await request.json()) as { notificationId?: string };
    if (!notificationId) return json({ error: "NOTIFICATION_REQUIRED" }, 400);

    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}&select=id,title,message,destination_url,scheduled_for,status`,
      { headers: { apikey: anonKey, Authorization: authorization } },
    );
    const visibleNotifications = await adminResponse.json();
    if (!adminResponse.ok) return json({ error: "AUTHORIZATION_CHECK_FAILED" }, 502);
    if (!Array.isArray(visibleNotifications) || !visibleNotifications.length) {
      return json({ error: "NOT_AUTHORIZED" }, 403);
    }
    const notification = visibleNotifications[0] as {
      id: string;
      title: string;
      message: string;
      destination_url: string | null;
      scheduled_for: string | null;
    };
    const serviceHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const deliveriesResponse = await fetch(
      `${supabaseUrl}/rest/v1/notification_deliveries?notification_id=eq.${encodeURIComponent(notificationId)}&provider=eq.google&status=in.(queued,demo)&select=id,wallet_pass_id`,
      { headers: serviceHeaders },
    );
    const deliveries = (await deliveriesResponse.json()) as Array<{
      id: string;
      wallet_pass_id: string | null;
    }>;
    if (!deliveriesResponse.ok) throw new Error("DELIVERIES_QUERY_FAILED");

    const accessToken = await getGoogleAccessToken(credentials);
    let delivered = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      let objectId: string | null = null;
      if (delivery.wallet_pass_id) {
        const passResponse = await fetch(
          `${supabaseUrl}/rest/v1/wallet_passes?id=eq.${encodeURIComponent(delivery.wallet_pass_id)}&select=provider_object_id&limit=1`,
          { headers: serviceHeaders },
        );
        const passes = (await passResponse.json()) as Array<{ provider_object_id: string | null }>;
        objectId = passes[0]?.provider_object_id ?? null;
      }

      let status = "failed";
      let failureReason: string | null = null;
      if (!objectId) {
        status = "skipped";
        failureReason = "GOOGLE_PASS_NOT_GENERATED";
      } else {
        const response = await fetch(
          `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}/addMessage`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                id: `fideleo-${notification.id}`,
                header: notification.title,
                body: notification.destination_url
                  ? `${notification.message}\n${notification.destination_url}`
                  : notification.message,
                messageType: "TEXT_AND_NOTIFY",
                ...(notification.scheduled_for
                  ? { displayInterval: { start: { date: notification.scheduled_for } } }
                  : {}),
              },
            }),
          },
        );
        if (response.ok) {
          status = "delivered";
          delivered += 1;
        } else {
          const errorBody = await response.text();
          failureReason = `GOOGLE_${response.status}: ${errorBody.slice(0, 350)}`;
        }
      }
      if (status !== "delivered") failed += 1;

      await fetch(
        `${supabaseUrl}/rest/v1/notification_deliveries?id=eq.${encodeURIComponent(delivery.id)}`,
        {
          method: "PATCH",
          headers: serviceHeaders,
          body: JSON.stringify({
            status,
            provider_message_id: status === "delivered" ? `fideleo-${notification.id}` : null,
            failure_reason: failureReason,
            attempted_at: new Date().toISOString(),
            delivered_at: status === "delivered" ? new Date().toISOString() : null,
          }),
        },
      );
    }

    const finalStatus = delivered > 0 ? (failed > 0 ? "partial" : "sent") : "failed";
    await fetch(
      `${supabaseUrl}/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}`,
      {
        method: "PATCH",
        headers: serviceHeaders,
        body: JSON.stringify({
          status: finalStatus,
          delivered_count: delivered,
          failed_count: failed,
          sent_at: delivered > 0 ? new Date().toISOString() : null,
        }),
      },
    );

    return json({ ok: true, delivered, failed, status: finalStatus });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "GOOGLE_WALLET_NOTIFICATION_FAILED" },
      500,
    );
  }
});
