import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ImagePlus, LoaderCircle, QrCode, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { num } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/panel/wallet")({
  component: WalletPage,
});

const defaultDesign = {
  backgroundColor: "#7A4A2B",
  textColor: "#FFFFFF",
  logoUrl: "",
  heroUrl: "",
  programName: "",
  pointsLabel: "Puntos",
};

type WalletProvider = "google" | "apple";
type WalletDesign = typeof defaultDesign;

function WalletPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const orgId = session?.org?.organization_id;
  const [design, setDesign] = useState(defaultDesign);
  const [provider, setProvider] = useState<WalletProvider>("google");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logoUrl" | "heroUrl" | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wallet-passes", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [passes, organization, branding] = await Promise.all([
        supabase
          .from("wallet_passes")
          .select("provider, status, is_sandbox, memberships!inner(organization_id)")
          .eq("memberships.organization_id", orgId!),
        supabase.from("organizations").select("display_name").eq("id", orgId!).single(),
        supabase
          .from("organization_branding")
          .select(
            "wallet_background_color, wallet_text_color, wallet_logo_url, wallet_hero_url, wallet_program_name, wallet_points_label, wallet_provider_designs, logo_url, primary_color, text_color",
          )
          .eq("organization_id", orgId!)
          .maybeSingle(),
      ]);
      if (passes.error) throw passes.error;
      if (organization.error) throw organization.error;
      if (branding.error) throw branding.error;
      return {
        passes: passes.data ?? [],
        organization: organization.data,
        branding: branding.data,
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    const providerDesigns = (data.branding?.wallet_provider_designs ?? {}) as Record<
      WalletProvider,
      Partial<WalletDesign> | undefined
    >;
    const savedDesign = providerDesigns[provider];
    if (savedDesign) {
      setDesign({
        ...defaultDesign,
        programName: data.organization.display_name ?? "Fideleo",
        ...savedDesign,
      });
      return;
    }

    if (provider === "apple") {
      setDesign({
        ...defaultDesign,
        backgroundColor: "#111111",
        programName: data.organization.display_name ?? "Fideleo",
      });
      return;
    }

    setDesign({
      backgroundColor:
        data.branding?.wallet_background_color ??
        data.branding?.primary_color ??
        defaultDesign.backgroundColor,
      textColor:
        data.branding?.wallet_text_color ?? data.branding?.text_color ?? defaultDesign.textColor,
      logoUrl: data.branding?.wallet_logo_url ?? data.branding?.logo_url ?? "",
      heroUrl: data.branding?.wallet_hero_url ?? "",
      programName:
        data.branding?.wallet_program_name ?? data.organization.display_name ?? "Fideleo",
      pointsLabel: data.branding?.wallet_points_label ?? defaultDesign.pointsLabel,
    });
  }, [data, provider]);

  const passes = data?.passes ?? [];
  const providerPasses = passes.filter((pass) => pass.provider === provider);
  const providerCount = (fn: (pass: { status: string; is_sandbox: boolean }) => boolean) =>
    providerPasses.filter((pass) => fn(pass as { status: string; is_sandbox: boolean })).length;

  const uploadAsset = async (file: File, kind: "logoUrl" | "heroUrl") => {
    if (!orgId) return;
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast.error(t("Formato no compatible"), { description: t("Utiliza PNG, JPG o WebP.") });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("La imagen no puede superar 5 MB"));
      return;
    }

    setUploading(kind);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const name = kind === "logoUrl" ? "wallet-logo" : "wallet-hero";
    const path = `${orgId}/${name}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, {
      contentType: file.type,
    });
    if (error) {
      setUploading(null);
      toast.error(t("No se pudo subir la imagen"), { description: error.message });
      return;
    }
    const signed = await supabase.storage.from("brand-assets").createSignedUrl(path, 31_536_000);
    setUploading(null);
    if (signed.error) {
      toast.error(t("No se pudo preparar la imagen"), { description: signed.error.message });
      return;
    }
    setDesign((current) => ({ ...current, [kind]: signed.data.signedUrl }));
    toast.success(t("Imagen preparada"));
  };

  const saveDesign = async () => {
    if (!orgId || !design.programName.trim() || !design.pointsLabel.trim()) {
      toast.error(t("Completa el nombre del programa y la etiqueta de puntos"));
      return;
    }
    setSaving(true);
    const storedDesigns = (data?.branding?.wallet_provider_designs ?? {}) as Record<
      string,
      Partial<WalletDesign>
    >;
    const payload = {
      organization_id: orgId,
      wallet_provider_designs: {
        ...storedDesigns,
        [provider]: {
          ...design,
          programName: design.programName.trim(),
          pointsLabel: design.pointsLabel.trim(),
        },
      },
      ...(provider === "google"
        ? {
            wallet_background_color: design.backgroundColor,
            wallet_text_color: design.textColor,
            wallet_logo_url: design.logoUrl || null,
            wallet_hero_url: design.heroUrl || null,
            wallet_program_name: design.programName.trim(),
            wallet_points_label: design.pointsLabel.trim(),
          }
        : {}),
    };
    const { error } = await supabase.from("organization_branding").upsert(payload);
    setSaving(false);
    if (error) {
      toast.error(t("No se pudo guardar"), { description: error.message });
      return;
    }
    toast.success(t("Diseño de Wallet actualizado"));
    void refetch();
  };

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;

  const imageField = (kind: "logoUrl" | "heroUrl", label: string, help: string) => (
    <div className="space-y-2">
      <Label htmlFor={`wallet-${kind}`}>{t(label)}</Label>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
        <Input
          id={`wallet-${kind}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={uploading !== null}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void uploadAsset(file, kind);
          }}
        />
        <Button asChild type="button" variant="outline" disabled={uploading !== null}>
          <label htmlFor={`wallet-${kind}`} className="cursor-pointer">
            {uploading === kind ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploading === kind ? t("Subiendo…") : t(design[kind] ? "Cambiar" : "Seleccionar")}
          </label>
        </Button>
        {design[kind] ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDesign((current) => ({ ...current, [kind]: "" }))}
          >
            <X className="size-4" /> {t("Quitar")}
          </Button>
        ) : null}
        <p className="basis-full text-xs text-muted-foreground">{t(help)}</p>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Wallet"
        description={t("Consulta el uso de cada Wallet y personaliza el aspecto de las tarjetas.")}
      />
      <section className="surface p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(["google", "apple"] as const).map((walletProvider) => {
            const selected = provider === walletProvider;
            const status = walletProvider === "google" ? t("Conectado") : t("Incompleto");
            return (
              <button
                key={walletProvider}
                type="button"
                onClick={() => setProvider(walletProvider)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <WalletProviderIcon provider={walletProvider} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {walletProvider === "google" ? "Tarjeta Google" : "Tarjeta Apple"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {walletProvider === "google" ? "Google Wallet" : "Apple Wallet"}
                  </span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    walletProvider === "google"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {provider === "google" ? "Google Wallet" : "Apple Wallet"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {provider === "google"
              ? t("Uso general de las tarjetas emitidas para Google Wallet.")
              : t("Métricas preparadas para la futura integración con Apple Wallet.")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("Tarjetas emitidas")} value={num(providerPasses.length)} />
          <MetricCard
            label={t("Tarjetas activas")}
            value={num(providerCount((pass) => pass.status === "active"))}
          />
          <MetricCard
            label={t("Pendientes")}
            value={num(
              providerCount(
                (pass) => pass.status === "update_pending" || pass.status === "pending_generation",
              ),
            )}
          />
          <MetricCard
            label={t("En pruebas")}
            value={num(providerCount((pass) => pass.is_sandbox))}
          />
        </div>
      </section>

      {provider === "apple" ? (
        <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <Clock3 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t("Integración en preparación")}</p>
            <p className="mt-1 text-sm opacity-75">
              {t(
                "Puedes adelantar el diseño visual. La emisión y actualización de pases Apple se activará cuando se incorporen sus credenciales.",
              )}
            </p>
          </div>
        </section>
      ) : (
        <section className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm">
            {t(
              "Google Wallet está conectado. Las tarjetas se generan desde el perfil de cada cliente y conservan su saldo actualizado.",
            )}
          </p>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {t("Diseño del pase {provider}", {
                provider: provider === "google" ? "Google Wallet" : "Apple Wallet",
              })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Personaliza el aspecto del pase digital y comprueba el resultado en tiempo real.",
              )}
            </p>
          </div>
          <Button disabled={saving || uploading !== null} onClick={() => void saveDesign()}>
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? t("Guardando…") : t("Guardar diseño")}
          </Button>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]">
          <section className="surface space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">{t("Aspecto de la tarjeta")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Los cambios aparecen al instante en la vista previa.")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wallet-program-name">{t("Nombre del programa")}</Label>
                <Input
                  id="wallet-program-name"
                  maxLength={40}
                  value={design.programName}
                  onChange={(event) =>
                    setDesign((current) => ({ ...current, programName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wallet-background">{t("Color de la tarjeta")}</Label>
                <Input
                  id="wallet-background"
                  type="color"
                  value={design.backgroundColor}
                  onChange={(event) =>
                    setDesign((current) => ({ ...current, backgroundColor: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wallet-text">{t("Color del texto")}</Label>
                <Input
                  id="wallet-text"
                  type="color"
                  value={design.textColor}
                  onChange={(event) =>
                    setDesign((current) => ({ ...current, textColor: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wallet-points-label">{t("Etiqueta del saldo")}</Label>
                <Input
                  id="wallet-points-label"
                  maxLength={24}
                  value={design.pointsLabel}
                  onChange={(event) =>
                    setDesign((current) => ({ ...current, pointsLabel: event.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                {imageField("logoUrl", "Logo de la tarjeta", "PNG, JPG o WebP · máximo 5 MB.")}
              </div>
              <div className="sm:col-span-2">
                {imageField(
                  "heroUrl",
                  "Imagen destacada",
                  "Recomendado: imagen horizontal de al menos 1032 × 336 px.",
                )}
              </div>
            </div>
          </section>

          <section className="surface p-5 sm:p-6 xl:sticky xl:top-24">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">{t("Vista previa")}</h2>
                <p className="text-xs text-muted-foreground">
                  {provider === "google" ? "Google Wallet" : "Apple Wallet"}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {t("En tiempo real")}
              </span>
            </div>
            <div className="mx-auto max-w-md overflow-hidden rounded-[1.65rem] shadow-2xl ring-1 ring-black/10">
              <div
                className="relative min-h-[26rem] overflow-hidden p-6"
                style={{ backgroundColor: design.backgroundColor, color: design.textColor }}
              >
                <div className="flex min-h-12 items-center justify-between gap-4">
                  {design.logoUrl ? (
                    <img
                      src={design.logoUrl}
                      alt={t("Vista previa del logo")}
                      className="max-h-12 max-w-36 object-contain object-left"
                    />
                  ) : (
                    <span className="font-display text-xl font-bold">
                      {design.programName || "Fideleo"}
                    </span>
                  )}
                  <span className="text-right text-xs font-semibold opacity-75">
                    {t("Tarjeta de fidelidad")}
                  </span>
                </div>
                {design.heroUrl ? (
                  <img
                    src={design.heroUrl}
                    alt={t("Vista previa de la imagen destacada")}
                    className="mt-5 h-32 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="mt-5 h-32 rounded-2xl bg-white/15" />
                )}
                <div className="mt-6 flex items-end justify-between gap-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[.14em] opacity-65">
                      {design.pointsLabel || t("Puntos")}
                    </p>
                    <p className="mt-1 text-4xl font-bold">6 / 10</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 text-black">
                    <QrCode className="size-16" strokeWidth={1.6} />
                  </div>
                </div>
                <div className="mt-7 border-t border-current/20 pt-4">
                  <p className="text-xs uppercase tracking-[.14em] opacity-65">{t("Cliente")}</p>
                  <p className="mt-1 font-semibold">Lucía García</p>
                </div>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
              {t(
                "La posición final puede variar ligeramente según el dispositivo y la versión de Wallet.",
              )}
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

function WalletProviderIcon({ provider }: { provider: WalletProvider }) {
  return (
    <span
      aria-hidden
      className={`relative block h-7 w-9 shrink-0 overflow-hidden rounded-md ${
        provider === "google" ? "bg-[#4285f4]" : "bg-[#4a4a4a]"
      }`}
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-[#ff5f57]" />
      <span className="absolute inset-x-0 top-1 h-1 bg-[#ffbd2e]" />
      <span className="absolute inset-x-0 top-2 h-1 bg-[#34c759]" />
      <span className="absolute bottom-1.5 left-2 right-2 h-2 rounded-b-md bg-white/80" />
    </span>
  );
}
