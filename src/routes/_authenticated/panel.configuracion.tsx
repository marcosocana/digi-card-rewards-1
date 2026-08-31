import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ban, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminScope } from "@/lib/session";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";

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
  const { organizationId: orgId, isGlobal } = useAdminScope();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [issuingKey, setIssuingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const hydrated = useRef(false);
  const lastSaved = useRef("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["business-settings", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [org, branding, integrations, apiKeys] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId!).single(),
        supabase
          .from("organization_branding")
          .select("*")
          .eq("organization_id", orgId!)
          .maybeSingle(),
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
        integrations: integrations.data ?? [],
        apiKeys: apiKeys.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    const nextForm = {
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
    };
    lastSaved.current = JSON.stringify(nextForm);
    hydrated.current = true;
    setForm(nextForm);
  }, [data]);

  const save = async (snapshot = form) => {
    if (!orgId || snapshot.display_name.trim().length < 2) return;
    setSaving(true);
    const [org, branding] = await Promise.all([
      supabase
        .from("organizations")
        .update({
          display_name: snapshot.display_name.trim(),
          legal_name: snapshot.legal_name || null,
          tax_id: snapshot.tax_id || null,
          registry_details: snapshot.registry_details || null,
          category: snapshot.category || null,
          contact_email: snapshot.contact_email || null,
          contact_phone: snapshot.contact_phone || null,
          address_line: snapshot.address_line || null,
          city: snapshot.city || null,
          postal_code: snapshot.postal_code || null,
          website: snapshot.website || null,
          instagram: snapshot.instagram || null,
          menu_url: snapshot.menu_url || null,
          timezone: snapshot.timezone,
          onboarding_step: 5,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", orgId),
      supabase.from("organization_branding").upsert({
        organization_id: orgId,
        legal_notice: snapshot.legal_notice || null,
        privacy_policy: snapshot.privacy_policy || null,
        cookie_policy: snapshot.cookie_policy || null,
      }),
    ]);
    setSaving(false);
    const error = org.error ?? branding.error;
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    lastSaved.current = JSON.stringify(snapshot);
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!hydrated.current || !data) return;
    const serialized = JSON.stringify(form);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => void saveRef.current(form), 700);
    return () => window.clearTimeout(timer);
  }, [form, data]);

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

  if (isGlobal)
    return (
      <>
        <PageHeader
          title="Configuración"
          description="Gestiona los datos y las integraciones de cualquier empresa."
        />
        <AdminScopeNotice action="consultar y editar su configuración" />
      </>
    );
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
      <PageHeader title="Configuración" />
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="business">Negocio</TabsTrigger>
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
