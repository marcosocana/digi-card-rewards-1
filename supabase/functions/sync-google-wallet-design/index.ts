const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...corsHeaders, "Cache-Control": "no-store" } });

type GoogleCredentials = { client_email: string; private_key: string };

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

const readCredentials = (): GoogleCredentials => {
  const raw =
    Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON") ??
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_WALLET_CREDENTIALS_MISSING");
  try {
    const credentials = JSON.parse(raw) as GoogleCredentials;
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
  const body = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !body.access_token)
    throw new Error(body.error || "GOOGLE_WALLET_AUTH_FAILED");
  return body.access_token;
};

const first = async <T>(url: string, headers: Record<string, string>) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`DATABASE_QUERY_FAILED (${response.status})`);
  const rows = (await response.json()) as T[];
  return rows[0] ?? null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = request.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "UNAUTHORIZED" }, 401);
    if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_CONFIGURATION_MISSING");
    if (!issuerId || !/^\d+$/.test(issuerId)) throw new Error("GOOGLE_WALLET_ISSUER_ID_MISSING");

    const { organizationId } = (await request.json()) as { organizationId?: string };
    if (!organizationId) return json({ error: "ORGANIZATION_REQUIRED" }, 400);

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authorization },
    });
    const authenticatedUser = (await authResponse.json()) as { id?: string };
    if (!authResponse.ok || !authenticatedUser.id) return json({ error: "UNAUTHORIZED" }, 401);

    const dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const [administrator, superadmin, organization, branding] = await Promise.all([
      first<{ id: string }>(
        `${supabaseUrl}/rest/v1/organization_users?organization_id=eq.${encodeURIComponent(organizationId)}&user_id=eq.${authenticatedUser.id}&role=eq.admin&status=eq.active&select=id&limit=1`,
        dbHeaders,
      ),
      first<{ id: string }>(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${authenticatedUser.id}&platform_role=eq.superadmin&select=id&limit=1`,
        dbHeaders,
      ),
      first<{ display_name: string }>(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}&select=display_name&limit=1`,
        dbHeaders,
      ),
      first<{
        wallet_background_color: string | null;
        wallet_logo_url: string | null;
        wallet_hero_url: string | null;
        wallet_program_name: string | null;
        wallet_points_label: string | null;
        logo_url: string | null;
        primary_color: string | null;
      }>(
        `${supabaseUrl}/rest/v1/organization_branding?organization_id=eq.${encodeURIComponent(organizationId)}&select=wallet_background_color,wallet_logo_url,wallet_hero_url,wallet_program_name,wallet_points_label,logo_url,primary_color&limit=1`,
        dbHeaders,
      ),
    ]);
    if (!administrator && !superadmin) return json({ error: "FORBIDDEN" }, 403);
    if (!organization || !branding) return json({ error: "DESIGN_NOT_FOUND" }, 404);

    const configuredClassId = Deno.env.get("GOOGLE_WALLET_CLASS_ID")?.trim();
    const classSuffix = `fideleo_${organizationId.replaceAll("-", "")}`;
    const classId = configuredClassId
      ? configuredClassId.includes(".")
        ? configuredClassId
        : `${issuerId}.${configuredClassId}`
      : `${issuerId}.${classSuffix}`;
    const logoUrl =
      branding.wallet_logo_url ??
      branding.logo_url ??
      `${Deno.env.get("WALLET_PUBLIC_BASE_URL") ?? "https://fideleo.store"}/isotipo.svg`;
    const classBody: Record<string, unknown> = {
      id: classId,
      issuerName: organization.display_name || "Fideleo",
      programName: branding.wallet_program_name || organization.display_name || "Fideleo",
      programLogo: {
        sourceUri: { uri: logoUrl },
        contentDescription: {
          defaultValue: {
            language: "es-ES",
            value: `Logo de ${organization.display_name || "Fideleo"}`,
          },
        },
      },
      accountNameLabel: "Cliente",
      accountIdLabel: "N.º de socio",
      hexBackgroundColor: branding.wallet_background_color || branding.primary_color || "#7A4A2B",
      countryCode: "ES",
      reviewStatus: "UNDER_REVIEW",
    };
    if (branding.wallet_hero_url) {
      classBody.heroImage = {
        sourceUri: { uri: branding.wallet_hero_url },
        contentDescription: {
          defaultValue: {
            language: "es-ES",
            value: `Imagen de ${organization.display_name || "Fideleo"}`,
          },
        },
      };
    }

    const accessToken = await getGoogleAccessToken(readCredentials());
    const walletHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const classEndpoint = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`;
    const existingClass = await fetch(classEndpoint, { headers: walletHeaders });
    const updateResponse =
      existingClass.status === 404
        ? await fetch("https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass", {
            method: "POST",
            headers: walletHeaders,
            body: JSON.stringify(classBody),
          })
        : existingClass.ok
          ? await fetch(classEndpoint, {
              method: "PATCH",
              headers: walletHeaders,
              body: JSON.stringify(classBody),
            })
          : existingClass;
    if (!updateResponse.ok) {
      const detail = (await updateResponse.text()).slice(0, 500);
      throw new Error(`GOOGLE_CLASS_UPDATE_FAILED (${updateResponse.status}): ${detail}`);
    }

    const completeResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/complete_google_wallet_design_update`,
      {
        method: "POST",
        headers: dbHeaders,
        body: JSON.stringify({ _organization_id: organizationId }),
      },
    );
    if (!completeResponse.ok) throw new Error("WALLET_UPDATE_STATUS_FAILED");

    return json({ updated: true, classId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GOOGLE_WALLET_DESIGN_SYNC_FAILED";
    console.error("sync-google-wallet-design", message);
    return json({ error: message }, 502);
  }
});
