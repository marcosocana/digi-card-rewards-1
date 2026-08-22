import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Copy,
  ExternalLink,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  Rocket,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/panel/configuracion")({
  component: ConfiguracionPage,
});

const empty = {
  display_name: "",
  legal_name: "",
  tax_id: "",
  registry_details: "",
  category: "",
  contact_email: "",
  contact_phone: "",
  address_line: "",
  city: "",
  postal_code: "",
  website: "",
  instagram: "",
  menu_url: "",
  timezone: "Europe/Madrid",
  primary_color: "#7A4A2B",
  secondary_color: "#D9A441",
  background_color: "#FBF7F0",
  text_color: "#1F1A16",
  logo_url: "",
  cover_url: "",
  welcome_message: "",
  program_description: "",
  legal_notice: "",
  privacy_policy: "",
  cookie_policy: "",
};

function ConfiguracionPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"logo_url" | "cover_url" | null>(null);
  const [issuingKey, setIssuingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["business-settings", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [org, branding, wallet, integrations, apiKeys] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId!).single(),
        supabase
          .from("organization_branding")
          .select("*")
          .eq("organization_id", orgId!)
          .maybeSingle(),
        supabase
          .from("wallet_integration_settings")
          .select("provider, mode, status, last_verified_at")
          .eq("organization_id", orgId!),
        supabase
          .from("integration_connections")
          .select("id, provider, status, last_sync_at, last_error")
          .eq("organization_id", orgId!),
        supabase
          .from("integration_api_keys")
          .select("id, name, key_prefix, status, last_used_at, expires_at, created_at")
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false }),
      ]);
      if (org.error) throw org.error;
      return {
        org: org.data,
        branding: branding.data,
        wallet: wallet.data ?? [],
        integrations: integrations.data ?? [],
        apiKeys: apiKeys.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      display_name: data.org.display_name ?? "",
      legal_name: data.org.legal_name ?? "",
      tax_id: data.org.tax_id ?? "",
      registry_details: data.org.registry_details ?? "",
      category: data.org.category ?? "",
      contact_email: data.org.contact_email ?? "",
      contact_phone: data.org.contact_phone ?? "",
      address_line: data.org.address_line ?? "",
      city: data.org.city ?? "",
      postal_code: data.org.postal_code ?? "",
      website: data.org.website ?? "",
      instagram: data.org.instagram ?? "",
      menu_url: data.org.menu_url ?? "",
      timezone: data.org.timezone ?? "Europe/Madrid",
      primary_color: data.branding?.primary_color ?? empty.primary_color,
      secondary_color: data.branding?.secondary_color ?? empty.secondary_color,
      background_color: data.branding?.background_color ?? empty.background_color,
      text_color: data.branding?.text_color ?? empty.text_color,
      logo_url: data.branding?.logo_url ?? "",
      cover_url: data.branding?.cover_url ?? "",
      welcome_message: data.branding?.welcome_message ?? "",
      program_description: data.branding?.program_description ?? "",
      legal_notice: data.branding?.legal_notice ?? "",
      privacy_policy: data.branding?.privacy_policy ?? "",
      cookie_policy: data.branding?.cookie_policy ?? "",
    });
  }, [data]);

  const save = async () => {
    if (!orgId || form.display_name.trim().length < 2) {
      toast.error("Indica el nombre comercial");
      return;
    }
    setSaving(true);
    const [org, branding] = await Promise.all([
      supabase
        .from("organizations")
        .update({
          display_name: form.display_name.trim(),
          legal_name: form.legal_name || null,
          tax_id: form.tax_id || null,
          registry_details: form.registry_details || null,
          category: form.category || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          address_line: form.address_line || null,
          city: form.city || null,
          postal_code: form.postal_code || null,
          website: form.website || null,
          instagram: form.instagram || null,
          menu_url: form.menu_url || null,
          timezone: form.timezone,
          onboarding_step: 5,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", orgId),
      supabase.from("organization_branding").upsert({
        organization_id: orgId,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        background_color: form.background_color,
        text_color: form.text_color,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
        welcome_message: form.welcome_message || null,
        program_description: form.program_description || null,
        legal_notice: form.legal_notice || null,
        privacy_policy: form.privacy_policy || null,
        cookie_policy: form.cookie_policy || null,
      }),
    ]);
    setSaving(false);
    const error = org.error ?? branding.error;
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Configuración actualizada");
    void refetch();
  };

  const uploadBrandAsset = async (file: File, kind: "logo_url" | "cover_url") => {
    if (!orgId) return;
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast.error("Formato no compatible", { description: "Utiliza una imagen PNG, JPG o WebP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }

    setUploadingAsset(kind);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const assetName = kind === "logo_url" ? "logo" : "cover";
    const path = `${orgId}/${assetName}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("brand-assets").upload(path, file, {
      contentType: file.type,
    });
    if (uploadError) {
      setUploadingAsset(null);
      toast.error("No se pudo subir la imagen", { description: uploadError.message });
      return;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("brand-assets")
      .createSignedUrl(path, 31_536_000);
    setUploadingAsset(null);
    if (signError) {
      toast.error("No se pudo preparar la imagen", { description: signError.message });
      return;
    }

    setForm((current) => ({ ...current, [kind]: signed.signedUrl }));
    toast.success("Imagen subida", { description: "Pulsa Guardar para publicar el cambio." });
  };

  const issueApiKey = async () => {
    if (!orgId) return;
    setIssuingKey(true);
    const { data: result, error } = await supabase.rpc("issue_integration_api_key", {
      _organization_id: orgId,
      _name: `POS ${new Date().toLocaleDateString("es-ES")}`,
    });
    setIssuingKey(false);
    if (error) {
      toast.error("No se pudo crear la clave", { description: error.message });
      return;
    }
    const value = result as { api_key?: string } | null;
    if (!value?.api_key) {
      toast.error("Supabase no devolvió la clave");
      return;
    }
    setNewApiKey(value.api_key);
    toast.success("Clave creada. Cópiala ahora; no volverá a mostrarse completa.");
    void refetch();
  };

  const revokeApiKey = async (id: string) => {
    if (!window.confirm("¿Revocar esta clave? El TPV dejará de poder enviar operaciones.")) return;
    const { error } = await supabase.rpc("revoke_integration_api_key", { _key_id: id });
    if (error) {
      toast.error("No se pudo revocar", { description: error.message });
      return;
    }
    toast.success("Clave revocada");
    void refetch();
  };

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos, identidad y presencia pública del negocio."
        actions={
          <Button disabled={saving || uploadingAsset !== null} onClick={() => void save()}>
            <Save className="size-4" /> {saving ? "Guardando…" : "Guardar"}
          </Button>
        }
      />
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="publish">Publicar club</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
        </TabsList>
        <TabsContent value="business" className="surface grid gap-4 p-5 sm:grid-cols-2">
          {field("display_name", "Nombre comercial")}
          {field("legal_name", "Razón social")}
          {field("tax_id", "NIF / CIF")}
          {field("registry_details", "Datos registrales")}
          {field("category", "Categoría")}
          {field("contact_email", "Email", "email")}
          {field("contact_phone", "Teléfono", "tel")}
          {field("address_line", "Dirección")}
          {field("city", "Ciudad")}
          {field("postal_code", "Código postal")}
          {field("timezone", "Zona horaria")}
          {field("website", "Web", "url")}
          {field("instagram", "Instagram")}
          {field("menu_url", "Enlace a carta o menú", "url")}
        </TabsContent>
        <TabsContent value="branding" className="grid gap-4 lg:grid-cols-2">
          <div className="surface grid gap-4 p-5 sm:grid-cols-2">
            {field("primary_color", "Color principal", "color")}
            {field("secondary_color", "Color secundario", "color")}
            {field("background_color", "Color de fondo", "color")}
            {field("text_color", "Color de texto", "color")}
            {(
              [
                ["logo_url", "Logo", "Se mostrará sobre la portada"],
                ["cover_url", "Imagen de portada", "Recomendado: formato horizontal"],
              ] as const
            ).map(([kind, label, help]) => (
              <div key={kind} className="space-y-2 sm:col-span-2">
                <Label htmlFor={`branding-${kind}`}>{label}</Label>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
                  <Input
                    id={`branding-${kind}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={uploadingAsset !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadBrandAsset(file, kind);
                    }}
                  />
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    disabled={uploadingAsset !== null}
                  >
                    <label htmlFor={`branding-${kind}`} className="cursor-pointer">
                      {uploadingAsset === kind ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus className="size-4" />
                      )}
                      {uploadingAsset === kind
                        ? "Subiendo…"
                        : form[kind]
                          ? `Cambiar ${label.toLowerCase()}`
                          : `Seleccionar ${label.toLowerCase()}`}
                    </label>
                  </Button>
                  {form[kind] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploadingAsset !== null}
                      onClick={() => setForm((current) => ({ ...current, [kind]: "" }))}
                    >
                      <X className="size-4" /> Quitar
                    </Button>
                  ) : null}
                  <p className="basis-full text-xs text-muted-foreground">
                    {help}. PNG, JPG o WebP · máximo 5 MB.
                  </p>
                </div>
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="welcome">Mensaje de bienvenida</Label>
              <Textarea
                id="welcome"
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="program-description">Descripción pública del club</Label>
              <Textarea
                id="program-description"
                value={form.program_description}
                onChange={(e) => setForm({ ...form, program_description: e.target.value })}
              />
            </div>
          </div>
          <div
            className="surface overflow-hidden"
            style={{ backgroundColor: form.background_color, color: form.text_color }}
          >
            <div className="relative h-64 overflow-hidden">
              {form.cover_url ? (
                <img
                  src={form.cover_url}
                  alt="Vista previa de portada"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/70" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Vista previa del logo"
                    className="mx-auto mb-4 max-h-16 max-w-36 rounded-xl bg-white p-2 object-contain"
                  />
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-widest">Vista previa</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">
                  {form.welcome_message || `Bienvenido a ${form.display_name}`}
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed opacity-70">
                {form.program_description || "Tu programa de fidelización, siempre contigo."}
              </p>
              <div
                className="mt-5 h-11 rounded-full"
                style={{ backgroundColor: form.primary_color }}
              />
              {data?.org.slug ? (
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link
                    to="/club/$businessSlug"
                    params={{ businessSlug: data.org.slug }}
                    target="_blank"
                  >
                    Abrir página pública
                    <ExternalLink className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="publish" className="surface p-5 sm:p-7">
          <div className="flex max-w-3xl flex-col gap-5 sm:flex-row sm:items-start">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Rocket className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">
                Configuración y publicación del club
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Completa la identidad, la mecánica de puntos, las recompensas y los establecimientos
                antes de publicar la experiencia para tus clientes.
              </p>
              <Button asChild className="mt-5">
                <Link to="/panel/onboarding">Abrir configuración guiada</Link>
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="wallet" className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Apple Wallet y Google Wallet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Arquitectura y cola de actualización activas. La emisión real requiere certificados de
            Apple y credenciales de Google configurados exclusivamente en backend.
          </p>
          <div className="mt-4 divide-y rounded-xl border">
            {(data?.wallet ?? []).map((item) => (
              <div key={item.provider} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium capitalize">{item.provider} Wallet</p>
                  <p className="text-xs text-muted-foreground">Modo {item.mode}</p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {item.status === "credentials_missing" ? "Credenciales pendientes" : item.status}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="integrations" className="space-y-4">
          <section className="surface p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="font-display text-lg font-semibold">API para TPV y POS</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Recibe operaciones externas en una cola segura, auditable e idempotente. Las
                  claves solo se muestran completas en el momento de crearlas.
                </p>
              </div>
              <Button disabled={issuingKey} onClick={() => void issueApiKey()}>
                <KeyRound className="size-4" />
                {issuingKey ? "Creando…" : "Crear clave API"}
              </Button>
            </div>
            {newApiKey ? (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                <p className="text-sm font-medium">Guarda esta clave ahora</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs">
                    {newApiKey}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(newApiKey);
                      toast.success("Clave copiada");
                    }}
                  >
                    <Copy className="size-4" /> Copiar
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-4 divide-y rounded-xl border">
              {(data?.apiKeys ?? []).length ? (
                data?.apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}…</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                        {key.status === "active" ? "Activa" : "Revocada"}
                      </span>
                      {key.status === "active" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Revocar ${key.name}`}
                          onClick={() => void revokeApiKey(key.id)}
                        >
                          <Ban className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Todavía no hay claves API. Crea una cuando vayas a conectar un TPV.
                </p>
              )}
            </div>
          </section>
          <section className="surface p-5">
            <h2 className="font-display text-lg font-semibold">Conectores</h2>
            <div className="mt-3 divide-y rounded-xl border">
              {(data?.integrations ?? []).length ? (
                data?.integrations.map((integration) => (
                  <div key={integration.id} className="flex justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-medium">{integration.provider}</span>
                    <span className="text-xs text-muted-foreground">{integration.status}</span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No hay conectores de terceros configurados.
                </p>
              )}
            </div>
          </section>
        </TabsContent>
        <TabsContent value="privacy" className="surface p-5 sm:p-7">
          <h2 className="font-display text-lg font-semibold">Privacidad y consentimientos</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            El alta exige aceptación expresa de términos y guarda el consentimiento comercial de
            forma independiente. Si dejas un texto vacío, se mostrará la plantilla legal de Fideleo
            con los datos del negocio.
          </p>
          <div className="mt-6 grid gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="legal-notice">Aviso legal personalizado</Label>
              <Textarea
                id="legal-notice"
                rows={8}
                value={form.legal_notice}
                onChange={(event) => setForm({ ...form, legal_notice: event.target.value })}
                placeholder="Opcional: sustituye por completo la plantilla de aviso legal."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="privacy-policy">Política de privacidad personalizada</Label>
              <Textarea
                id="privacy-policy"
                rows={10}
                value={form.privacy_policy}
                onChange={(event) => setForm({ ...form, privacy_policy: event.target.value })}
                placeholder="Opcional: sustituye por completo la plantilla de privacidad."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cookie-policy">Política de cookies personalizada</Label>
              <Textarea
                id="cookie-policy"
                rows={8}
                value={form.cookie_policy}
                onChange={(event) => setForm({ ...form, cookie_policy: event.target.value })}
                placeholder="Opcional: sustituye por completo la plantilla de cookies."
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
