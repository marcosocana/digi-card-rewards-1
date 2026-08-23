const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
};

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Datos que envía Lovable
    const { userUuid, customerName, currentPoints } = await req.json();

    // 2. Leer la clave de Google desde el Vault de Supabase
    const googleCredentialsJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleCredentialsJson) {
      throw new Error("Falta la variable GOOGLE_SERVICE_ACCOUNT_JSON en Supabase");
    }
    const credentials = JSON.parse(googleCredentialsJson);

    // Configuración con tus IDs reales de Google Wallet
    const ISSUER_ID = "3388000000023188333"; // Tu ID de emisor de la captura
    const CLASS_ID = "tarjeta_sellos_v1";

    // 3. Estructura de la tarjeta del cliente
    const loyaltyObject = {
      id: `${ISSUER_ID}.${userUuid}`,
      classId: `${ISSUER_ID}.${CLASS_ID}`,
      accountName: customerName,
      accountId: userUuid,
      status: "active",
      barcode: {
        type: "QR_CODE",
        value: userUuid,
      },
      loyaltyPoints: {
        label: "Sellos Acumulados",
        balance: {
          string: `${currentPoints} / 10`,
        },
      },
    };

    // 4. Configurar el Payload para Google
    const payload = {
      iss: credentials.client_email,
      aud: "google",
      origins: [],
      typ: "savetowallet",
      payload: {
        loyaltyObjects: [loyaltyObject],
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // 5. Transformar e importar la clave PEM de Google para Deno
    const privateKeyClean = credentials.private_key.replace(
      /-----\s*BEGIN PRIVATE KEY\s*-----|-----\s*END PRIVATE KEY\s*-----|\n|\r/g,
      "",
    );
    const binaryKey = Uint8Array.from(atob(privateKeyClean), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["sign"],
    );

    // 6. Firmar el token JWT y generar enlace público
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64Url(JSON.stringify(payload));
    const unsignedToken = `${header}.${claims}`;
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(unsignedToken),
    );
    const jwt = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;
    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    return new Response(JSON.stringify({ url: saveUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
