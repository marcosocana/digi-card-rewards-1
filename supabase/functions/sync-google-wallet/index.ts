const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { ...corsHeaders, "Cache-Control": "no-store" },
  });

type GoogleCredentials = { client_email: string; private_key: string };
type Membership = {
  id: string;
  public_id: string;
  organization_id: string;
  program_id: string;
  cached_points_balance: number;
};
type WalletPass = { id: string; provider_object_id: string | null };

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const importPrivateKey = (pem: string) => {
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

const signJwt = async (credentials: GoogleCredentials, payload: Record<string, unknown>) => {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await importPrivateKey(credentials.private_key),
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
};

const readCredentials = () => {
  const raw =
    Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON") ??
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const encoded = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64");
  if (!raw && !encoded) throw new Error("GOOGLE_WALLET_CREDENTIALS_MISSING");

  try {
    const credentials = JSON.parse(raw ?? atob(encoded!)) as GoogleCredentials;
    if (!credentials.client_email || !credentials.private_key) throw new Error();
    return credentials;
  } catch {
    throw new Error("GOOGLE_WALLET_CREDENTIALS_INVALID");
  }
};

const getGoogleAccessToken = async (credentials: GoogleCredentials) => {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(credentials, {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
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
    throw new Error(body.error_description ?? body.error ?? "GOOGLE_WALLET_AUTH_FAILED");
  }
  return body.access_token as string;
};

const first = async <T>(url: string, headers: Record<string, string>) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`DATABASE_QUERY_FAILED (${response.status})`);
  const rows = (await response.json()) as T[];
  return rows[0] ?? null;
};

// Keep the visible loyalty balance provider-neutral: it is a number of points,
// even when points are earned from spending or cashback rules.
const pointsBalance = (balance: number) => String(balance);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  let passId: string | null = null;
  let dbHeaders: Record<string, string> | null = null;
  let supabaseUrl: string | null = null;

  try {
    const authorization = request.headers.get("authorization");
    supabaseUrl = Deno.env.get("SUPABASE_URL") ?? null;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "UNAUTHORIZED" }, 401);
    if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_CONFIGURATION_MISSING");
    if (!issuerId || !/^\d+$/.test(issuerId)) throw new Error("GOOGLE_WALLET_ISSUER_ID_MISSING");

    const { membershipId } = (await request.json()) as { membershipId?: string };
    if (!membershipId) return json({ error: "MEMBERSHIP_REQUIRED" }, 400);

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authorization },
    });
    const authenticatedUser = (await authResponse.json()) as { id?: string };
    if (!authResponse.ok || !authenticatedUser.id) return json({ error: "UNAUTHORIZED" }, 401);

    dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const membership = await first<Membership>(
      `${supabaseUrl}/rest/v1/memberships?id=eq.${encodeURIComponent(membershipId)}&status=eq.active&select=id,public_id,organization_id,program_id,cached_points_balance&limit=1`,
      dbHeaders,
    );
    if (!membership) return json({ error: "MEMBERSHIP_NOT_FOUND" }, 404);

    const organizationUser = await first<{ id: string }>(
      `${supabaseUrl}/rest/v1/organization_users?organization_id=eq.${membership.organization_id}&user_id=eq.${authenticatedUser.id}&status=eq.active&select=id&limit=1`,
      dbHeaders,
    );
    if (!organizationUser) {
      const superadmin = await first<{ id: string }>(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${authenticatedUser.id}&platform_role=eq.superadmin&select=id&limit=1`,
        dbHeaders,
      );
      if (!superadmin) return json({ error: "FORBIDDEN" }, 403);
    }

    const walletPass = await first<WalletPass>(
      `${supabaseUrl}/rest/v1/wallet_passes?membership_id=eq.${membership.id}&provider=eq.google&status=neq.revoked&select=id,provider_object_id&limit=1`,
      dbHeaders,
    );
    if (!walletPass) return json({ synced: false, reason: "GOOGLE_PASS_NOT_INSTALLED" });
    passId = walletPass.id;

    const [program, branding] = await Promise.all([
      first<{ mechanic_type: string }>(
        `${supabaseUrl}/rest/v1/loyalty_programs?id=eq.${membership.program_id}&select=mechanic_type&limit=1`,
        dbHeaders,
      ),
      first<{ wallet_points_label: string | null }>(
        `${supabaseUrl}/rest/v1/organization_branding?organization_id=eq.${membership.organization_id}&select=wallet_points_label&limit=1`,
        dbHeaders,
      ),
    ]);
    if (!program) throw new Error("PROGRAM_NOT_FOUND");

    const objectId = walletPass.provider_object_id || `${issuerId}.${membership.public_id}`;
    const credentials = readCredentials();
    const accessToken = await getGoogleAccessToken(credentials);
    const objectResponse = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loyaltyPoints: {
            label:
              branding?.wallet_points_label ||
              (program.mechanic_type === "stamps" ? "Sellos" : "Puntos"),
            balance: {
              string: pointsBalance(membership.cached_points_balance),
            },
          },
        }),
      },
    );
    if (!objectResponse.ok) {
      const detail = (await objectResponse.text()).slice(0, 500);
      throw new Error(`GOOGLE_OBJECT_UPDATE_FAILED (${objectResponse.status}): ${detail}`);
    }

    const now = new Date().toISOString();
    await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/wallet_passes?id=eq.${passId}`, {
        method: "PATCH",
        headers: { ...dbHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "active",
          last_updated_at: now,
          last_error_code: null,
          last_error_message: null,
        }),
      }),
      fetch(
        `${supabaseUrl}/rest/v1/wallet_jobs?wallet_pass_id=eq.${passId}&status=in.(pending,processing)`,
        {
          method: "PATCH",
          headers: { ...dbHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ status: "completed", completed_at: now, error: null }),
        },
      ),
    ]);

    return json({ synced: true, balance: membership.cached_points_balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GOOGLE_WALLET_SYNC_FAILED";
    console.error("sync-google-wallet", message);
    if (passId && dbHeaders && supabaseUrl) {
      const now = new Date().toISOString();
      await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/wallet_passes?id=eq.${passId}`, {
          method: "PATCH",
          headers: { ...dbHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "update_pending",
            last_error_code: "GOOGLE_OBJECT_UPDATE_FAILED",
            last_error_message: message.slice(0, 500),
          }),
        }),
        fetch(
          `${supabaseUrl}/rest/v1/wallet_jobs?wallet_pass_id=eq.${passId}&status=in.(pending,processing)`,
          {
            method: "PATCH",
            headers: { ...dbHeaders, Prefer: "return=minimal" },
            body: JSON.stringify({
              status: "failed",
              completed_at: now,
              error: message.slice(0, 500),
            }),
          },
        ),
      ]);
    }
    return json({ error: message }, 502);
  }
});
