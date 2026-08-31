import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Check,
  Circle,
  Coffee,
  Crown,
  Diamond,
  Flower2,
  Gift,
  Heart,
  IceCreamBowl,
  Leaf,
  Moon,
  Music,
  Pizza,
  Scissors,
  Smile,
  Sparkles,
  Star,
  Sun,
  Utensils,
  Zap,
  Clock3,
  EllipsisVertical,
  ImagePlus,
  LoaderCircle,
  QrCode,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminScope } from "@/lib/session";
import { num } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { qrPngDataUrl } from "@/lib/qr";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";
import { loyaltyModuleTabs, ModuleTabs } from "@/components/app/module-tabs";
import {
  ProgramMechanicSwitch,
  type ProgramMechanic,
} from "@/components/app/program-mechanic-switch";
import { setProgramMechanic } from "@/lib/loyalty-program";

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
  stampColor: "#000000",
  stampIcon: "coffee",
  welcomeStamps: 0,
  stampReward: "1 café",
  stampTarget: 10,
};

type WalletProvider = "google" | "apple";
type WalletDesign = typeof defaultDesign;
const stampIcons = [
  { id: "heart", label: "Corazón", Icon: Heart },
  { id: "star", label: "Estrella", Icon: Star },
  { id: "check", label: "Check", Icon: Check },
  { id: "circle", label: "Círculo", Icon: Circle },
  { id: "diamond", label: "Diamante", Icon: Diamond },
  { id: "sparkles", label: "Destellos", Icon: Sparkles },
  { id: "sun", label: "Sol", Icon: Sun },
  { id: "moon", label: "Luna", Icon: Moon },
  { id: "flower", label: "Flor", Icon: Flower2 },
  { id: "leaf", label: "Hoja", Icon: Leaf },
  { id: "smile", label: "Sonrisa", Icon: Smile },
  { id: "crown", label: "Corona", Icon: Crown },
  { id: "gift", label: "Regalo", Icon: Gift },
  { id: "zap", label: "Rayo", Icon: Zap },
  { id: "coffee", label: "Café", Icon: Coffee },
  { id: "pizza", label: "Pizza", Icon: Pizza },
  { id: "ice-cream", label: "Helado", Icon: IceCreamBowl },
  { id: "utensils", label: "Cubiertos", Icon: Utensils },
  { id: "scissors", label: "Tijeras", Icon: Scissors },
  { id: "music", label: "Música", Icon: Music },
];
type HeroCrop = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

const GOOGLE_HERO_WIDTH = 1032;
const GOOGLE_HERO_HEIGHT = 336;
const GOOGLE_HERO_ASPECT = GOOGLE_HERO_WIDTH / GOOGLE_HERO_HEIGHT;

function WalletPage() {
  const {
    session,
    organizationId: orgId,
    isSuperadmin,
    isGlobal,
    selectedLocationIds,
  } = useAdminScope();
  const locationId = selectedLocationIds.length === 1 ? selectedLocationIds[0] : null;
  const { t } = useI18n();
  const [design, setDesign] = useState(defaultDesign);
  const [provider, setProvider] = useState<WalletProvider>("google");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logoUrl" | "heroUrl" | null>(null);
  const [heroCrop, setHeroCrop] = useState<HeroCrop | null>(null);
  const [cropApplying, setCropApplying] = useState(false);
  const [switching, setSwitching] = useState(false);
  const hydrated = useRef(false);
  const lastSaved = useRef("");

  useEffect(() => {
    const previewUrl = heroCrop?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [heroCrop?.previewUrl]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wallet-passes", orgId, isSuperadmin, locationId],
    enabled: Boolean(session && orgId && locationId),
    queryFn: async () => {
      let passesQuery = supabase
        .from("wallet_passes")
        .select("provider, status, is_sandbox, memberships!inner(organization_id)");
      let settingsQuery = supabase
        .from("wallet_integration_settings")
        .select("provider, mode, status, last_verified_at, last_error");
      if (orgId) {
        passesQuery = passesQuery.eq("memberships.organization_id", orgId);
        settingsQuery = settingsQuery.eq("organization_id", orgId);
      }
      const organizationQuery = orgId
        ? supabase.from("organizations").select("display_name").eq("id", orgId).single()
        : Promise.resolve({ data: { display_name: "Todas las empresas" }, error: null });
      const brandingQuery = orgId
        ? supabase
            .from("organization_branding")
            .select(
              "wallet_background_color, wallet_text_color, wallet_logo_url, wallet_hero_url, wallet_program_name, wallet_points_label, wallet_provider_designs, logo_url, primary_color, text_color",
            )
            .eq("organization_id", orgId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const programQuery = supabase
        .from("loyalty_programs")
        .select("id,public_name,mechanic_type,mechanic_config,program_locations!inner(location_id)")
        .eq("organization_id", orgId!)
        .eq("program_locations.location_id", locationId!)
        .limit(1)
        .maybeSingle();
      const [passes, organization, branding, settings, program] = await Promise.all([
        passesQuery,
        organizationQuery,
        brandingQuery,
        settingsQuery,
        programQuery,
      ]);
      if (passes.error) throw passes.error;
      if (organization.error) throw organization.error;
      if (branding.error) throw branding.error;
      if (settings.error) throw settings.error;
      if (program.error) throw program.error;
      return {
        passes: passes.data ?? [],
        organization: organization.data,
        branding: branding.data,
        settings: settings.data ?? [],
        program: program.data,
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    const applySavedDesign = (nextDesign: WalletDesign) => {
      lastSaved.current = JSON.stringify({ provider, design: nextDesign });
      hydrated.current = true;
      setDesign(nextDesign);
    };
    if (data.program?.mechanic_type === "stamps") {
      const config = (data.program.mechanic_config ?? {}) as Record<string, unknown>;
      const stampDesigns = (config.wallet_designs ?? {}) as Record<
        WalletProvider,
        Partial<WalletDesign> | undefined
      >;
      applySavedDesign({
        ...defaultDesign,
        ...stampDesigns[provider],
        programName: data.program.public_name || data.organization.display_name || "Fideleo",
        pointsLabel: "Sellos",
        welcomeStamps: Number(config.welcome_stamps ?? 0),
        stampReward: String(config.stamp_reward_name ?? "1 café"),
        stampColor: String(config.stamp_color ?? "#000000"),
        stampIcon: String(config.stamp_icon ?? "coffee"),
        stampTarget: Math.min(20, Math.max(5, Number(config.stamp_target ?? 10))),
      });
      return;
    }
    const providerDesigns = (data.branding?.wallet_provider_designs ?? {}) as Record<
      WalletProvider,
      Partial<WalletDesign> | undefined
    >;
    const savedDesign = providerDesigns[provider];
    if (savedDesign) {
      applySavedDesign({
        ...defaultDesign,
        programName: data.organization.display_name ?? "Fideleo",
        ...savedDesign,
      });
      return;
    }

    if (provider === "apple") {
      applySavedDesign({
        ...defaultDesign,
        backgroundColor: "#111111",
        programName: data.organization.display_name ?? "Fideleo",
      });
      return;
    }

    applySavedDesign({
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

  const isStampProgram = data?.program?.mechanic_type === "stamps";

  const passes = data?.passes ?? [];
  const providerSetting = data?.settings.find((setting) => setting.provider === provider);
  const providerConnected =
    providerSetting?.mode === "live" && providerSetting?.status === "active";
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

  const closeHeroCrop = () => {
    if (heroCrop) URL.revokeObjectURL(heroCrop.previewUrl);
    setHeroCrop(null);
  };

  const prepareHeroCrop = async (file: File) => {
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast.error(t("Formato no compatible"), { description: t("Utiliza PNG, JPG o WebP.") });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("La imagen no puede superar 5 MB"));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = previewUrl;
    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(previewUrl);
      toast.error(t("No se ha podido leer la imagen"));
      return;
    }

    if (image.naturalWidth < GOOGLE_HERO_WIDTH || image.naturalHeight < GOOGLE_HERO_HEIGHT) {
      URL.revokeObjectURL(previewUrl);
      toast.error(t("La imagen es demasiado pequeña"), {
        description: t("Utiliza una imagen de al menos 1032 × 336 px para evitar ampliarla."),
      });
      return;
    }

    if (image.naturalWidth === GOOGLE_HERO_WIDTH && image.naturalHeight === GOOGLE_HERO_HEIGHT) {
      URL.revokeObjectURL(previewUrl);
      await uploadAsset(file, "heroUrl");
      return;
    }

    closeHeroCrop();
    setHeroCrop({
      file,
      previewUrl,
      width: image.naturalWidth,
      height: image.naturalHeight,
      x: 50,
      y: 50,
    });
  };

  const applyHeroCrop = async () => {
    if (!heroCrop || cropApplying) return;
    setCropApplying(true);
    try {
      const image = new Image();
      image.src = heroCrop.previewUrl;
      await image.decode();

      const sourceAspect = heroCrop.width / heroCrop.height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = heroCrop.width;
      let sourceHeight = heroCrop.height;
      if (sourceAspect > GOOGLE_HERO_ASPECT) {
        sourceWidth = heroCrop.height * GOOGLE_HERO_ASPECT;
        sourceX = (heroCrop.width - sourceWidth) * (heroCrop.x / 100);
      } else if (sourceAspect < GOOGLE_HERO_ASPECT) {
        sourceHeight = heroCrop.width / GOOGLE_HERO_ASPECT;
        sourceY = (heroCrop.height - sourceHeight) * (heroCrop.y / 100);
      }

      const canvas = document.createElement("canvas");
      canvas.width = GOOGLE_HERO_WIDTH;
      canvas.height = GOOGLE_HERO_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("CANVAS_NOT_AVAILABLE");
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        GOOGLE_HERO_WIDTH,
        GOOGLE_HERO_HEIGHT,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("IMAGE_EXPORT_FAILED"))),
          "image/webp",
          0.9,
        ),
      );
      const croppedFile = new File([blob], "wallet-hero.webp", { type: "image/webp" });
      closeHeroCrop();
      await uploadAsset(croppedFile, "heroUrl");
    } catch (error) {
      toast.error(t("No se ha podido recortar la imagen"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCropApplying(false);
    }
  };

  const saveDesign = async (snapshot = design) => {
    if (!orgId || !snapshot.programName.trim() || !snapshot.pointsLabel.trim()) return;
    setSaving(true);
    if (isStampProgram && data?.program) {
      const currentConfig = (data.program.mechanic_config ?? {}) as Record<string, unknown>;
      const currentDesigns = (currentConfig.wallet_designs ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("loyalty_programs")
        .update({
          mechanic_config: {
            ...currentConfig,
            stamp_target: snapshot.stampTarget,
            welcome_stamps: Math.min(
              snapshot.stampTarget - 1,
              Math.max(0, Math.round(snapshot.welcomeStamps)),
            ),
            stamp_icon: snapshot.stampIcon,
            stamp_color: snapshot.stampColor,
            wallet_designs: {
              ...currentDesigns,
              [provider]: {
                ...snapshot,
                programName: snapshot.programName.trim(),
                pointsLabel: "Sellos",
              },
            },
          },
          initial_points: Math.min(
            snapshot.stampTarget - 1,
            Math.max(0, Math.round(snapshot.welcomeStamps)),
          ),
        })
        .eq("id", data.program.id);
      if (error) {
        setSaving(false);
        toast.error(t("No se pudo guardar"), { description: error.message });
        return;
      }
      setSaving(false);
      lastSaved.current = JSON.stringify({ provider, design: snapshot });
      return;
    }
    const storedDesigns = (data?.branding?.wallet_provider_designs ?? {}) as Record<
      string,
      Partial<WalletDesign>
    >;
    const payload = {
      organization_id: orgId,
      wallet_provider_designs: {
        ...storedDesigns,
        [provider]: {
          ...snapshot,
          programName: snapshot.programName.trim(),
          pointsLabel: snapshot.pointsLabel.trim(),
        },
      },
      ...(provider === "google"
        ? {
            wallet_background_color: snapshot.backgroundColor,
            wallet_text_color: snapshot.textColor,
            wallet_logo_url: snapshot.logoUrl || null,
            wallet_hero_url: snapshot.heroUrl || null,
            wallet_program_name: snapshot.programName.trim(),
            wallet_points_label: snapshot.pointsLabel.trim(),
          }
        : {}),
    };
    const { error } = await supabase.from("organization_branding").upsert(payload);
    if (error) {
      setSaving(false);
      toast.error(t("No se pudo guardar"), { description: error.message });
      return;
    }
    if (provider === "google") {
      const { data: syncResult, error: syncError } = await supabase.functions.invoke<{
        updated?: boolean;
        error?: string;
      }>("sync-google-wallet-design", { body: { organizationId: orgId } });
      if (syncError || !syncResult?.updated) {
        setSaving(false);
        toast.warning(t("Diseño guardado, pero Google Wallet no pudo actualizarse"), {
          description: syncResult?.error ?? syncError?.message,
        });
        return;
      }
    }
    setSaving(false);
    lastSaved.current = JSON.stringify({ provider, design: snapshot });
  };
  const saveDesignRef = useRef(saveDesign);
  saveDesignRef.current = saveDesign;

  useEffect(() => {
    if (!hydrated.current || !data || switching || uploading !== null || heroCrop) return;
    const serialized = JSON.stringify({ provider, design });
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => void saveDesignRef.current(design), 900);
    return () => window.clearTimeout(timer);
  }, [design, provider, data, switching, uploading, heroCrop]);

  const changeMechanic = async (mechanic: ProgramMechanic) => {
    if (!data?.program || !locationId || mechanic === (isStampProgram ? "stamps" : "points"))
      return;
    setSwitching(true);
    try {
      await setProgramMechanic(data.program.id, locationId, mechanic);
      toast.success(
        mechanic === "stamps" ? "Programa cambiado a Sellos" : "Programa cambiado a Puntos",
      );
      await refetch();
    } catch (error) {
      toast.error("No se pudo cambiar el tipo de programa", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSwitching(false);
    }
  };

  if (!locationId)
    return (
      <>
        <PageHeader
          title="Programa de fidelización"
          description="Configuración por establecimiento."
        />
        <AdminScopeNotice action="personalizar el Wallet de ese establecimiento" />
      </>
    );
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
            if (!file) return;
            if (provider === "google" && kind === "heroUrl") void prepareHeroCrop(file);
            else void uploadAsset(file, kind);
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
      <Dialog
        open={Boolean(heroCrop)}
        onOpenChange={(open) => {
          if (!open && !cropApplying) closeHeroCrop();
        }}
      >
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("Encuadra la imagen de Google Wallet")}</DialogTitle>
            <DialogDescription>
              {t(
                "Solo se guardará el contenido visible dentro de la franja. La imagen no se ampliará ni perderá resolución.",
              )}
            </DialogDescription>
          </DialogHeader>
          {heroCrop ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-xl bg-muted ring-1 ring-black/10">
                <div className="aspect-[1032/336] w-full overflow-hidden">
                  <img
                    src={heroCrop.previewUrl}
                    alt={t("Vista previa del recorte de la imagen")}
                    className="size-full object-cover"
                    style={{ objectPosition: `${heroCrop.x}% ${heroCrop.y}%` }}
                  />
                </div>
              </div>
              {heroCrop.width / heroCrop.height > GOOGLE_HERO_ASPECT ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{t("Posición horizontal")}</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(heroCrop.x)}%</span>
                  </div>
                  <Slider
                    value={[heroCrop.x]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([x]) =>
                      setHeroCrop((current) => (current ? { ...current, x } : current))
                    }
                  />
                </div>
              ) : heroCrop.width / heroCrop.height < GOOGLE_HERO_ASPECT ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{t("Posición vertical")}</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(heroCrop.y)}%</span>
                  </div>
                  <Slider
                    value={[heroCrop.y]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([y]) =>
                      setHeroCrop((current) => (current ? { ...current, y } : current))
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("La imagen ya tiene la proporción correcta y solo se reducirá de tamaño.")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("Salida final: 1032 × 336 px. No se permite zoom ni ampliación.")}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={cropApplying} onClick={closeHeroCrop}>
              {t("Cancelar")}
            </Button>
            <Button type="button" disabled={cropApplying} onClick={() => void applyHeroCrop()}>
              {cropApplying ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {cropApplying ? t("Preparando…") : t("Usar este encuadre")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PageHeader
        title="Programa de fidelización"
        description={t("Consulta el uso de cada Wallet y personaliza el aspecto de las tarjetas.")}
      />
      {data?.program ? (
        <ProgramMechanicSwitch
          value={isStampProgram ? "stamps" : "points"}
          onChange={(value) => void changeMechanic(value)}
          disabled={switching || saving}
        />
      ) : null}
      <ModuleTabs tabs={loyaltyModuleTabs} />
      {isGlobal || !locationId ? (
        <AdminScopeNotice action="personalizar el Wallet de ese establecimiento" />
      ) : null}
      <section className="surface p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(["google", "apple"] as const).map((walletProvider) => {
            const selected = provider === walletProvider;
            const walletSetting = data?.settings.find(
              (setting) => setting.provider === walletProvider,
            );
            const connected = walletSetting?.mode === "live" && walletSetting?.status === "active";
            const status = connected
              ? t("Conectado")
              : walletProvider === "apple"
                ? t("Diseño disponible")
                : t("Incompleto");
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
                    connected
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

      {!providerConnected ? (
        <section
          className={`flex gap-3 rounded-2xl border p-4 ${
            provider === "apple"
              ? "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          }`}
        >
          <Clock3 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">
              {provider === "apple" ? t("Personalización disponible") : t("Integración pendiente")}
            </p>
            <p className="mt-1 text-sm opacity-75">
              {provider === "google"
                ? t(
                    "Google Wallet se mostrará como conectado después de validar las credenciales y generar el primer pase.",
                  )
                : t(
                    "Puedes editar, guardar y revisar ahora el diseño de Apple Wallet. La emisión y actualización de pases se activará cuando se incorporen sus credenciales.",
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
          <span className="text-sm text-muted-foreground">
            {uploading !== null
              ? t("Subiendo…")
              : saving
                ? t("Guardando…")
                : t("Guardado automático")}
          </span>
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
              <div className={`space-y-1.5 ${provider === "google" ? "sm:col-span-2" : ""}`}>
                <Label htmlFor="wallet-background">{t("Color de la tarjeta")}</Label>
                <Input
                  id="wallet-background"
                  type="color"
                  value={design.backgroundColor}
                  onChange={(event) =>
                    setDesign((current) => ({ ...current, backgroundColor: event.target.value }))
                  }
                />
                {provider === "google" ? (
                  <p className="text-xs text-muted-foreground">
                    Google elige automáticamente texto claro u oscuro para mantener el contraste.
                  </p>
                ) : null}
              </div>
              {provider === "apple" ? (
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
              ) : null}
              {!isStampProgram ? (
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
              ) : null}
              {isStampProgram ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="wallet-stamp-color">Color de los sellos</Label>
                    <Input
                      id="wallet-stamp-color"
                      type="color"
                      value={design.stampColor}
                      onChange={(event) =>
                        setDesign((current) => ({ ...current, stampColor: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wallet-welcome-stamps">Sellos al reclamar la tarjeta</Label>
                    <Input
                      id="wallet-welcome-stamps"
                      type="number"
                      min="0"
                      max={design.stampTarget - 1}
                      value={design.welcomeStamps}
                      onChange={(event) =>
                        setDesign((current) => ({
                          ...current,
                          welcomeStamps: Math.min(
                            current.stampTarget - 1,
                            Math.max(0, Number(event.target.value)),
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Icono del sello</Label>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {stampIcons.map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          aria-label={icon.label}
                          title={icon.label}
                          onClick={() =>
                            setDesign((current) => ({ ...current, stampIcon: icon.id }))
                          }
                          className={`grid aspect-square place-items-center rounded-xl border transition ${design.stampIcon === icon.id ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "hover:bg-muted"}`}
                        >
                          <icon.Icon className="size-5" strokeWidth={1.8} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
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
            {isStampProgram ? (
              <StampWalletPreview
                design={design}
                issuerName={data?.organization.display_name ?? "Fideleo"}
              />
            ) : provider === "google" ? (
              <GoogleWalletPreview
                design={design}
                issuerName={data?.organization.display_name ?? "Fideleo"}
              />
            ) : (
              <AppleWalletPreview design={design} />
            )}
            <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
              {provider === "google"
                ? "La vista reproduce la plantilla predeterminada de fidelización. Google controla la tipografía, el contraste y los ajustes finales según el dispositivo."
                : t(
                    "La posición final puede variar ligeramente según el dispositivo y la versión de Wallet.",
                  )}
            </p>
          </section>
        </div>
      </section>
    </>
  );
}

function StampWalletPreview({ design, issuerName }: { design: WalletDesign; issuerName: string }) {
  const [qrUrl, setQrUrl] = useState("");
  const textColor = walletContrastColor(design.backgroundColor);
  const StampIcon = stampIcons.find((item) => item.id === design.stampIcon)?.Icon ?? Check;
  const stampTarget = Math.min(20, Math.max(5, Math.round(design.stampTarget)));
  const completed = Math.min(stampTarget - 1, Math.max(0, Math.round(design.welcomeStamps)));

  useEffect(() => {
    let mounted = true;
    void qrPngDataUrl("F7D4K2", "#000000").then((url) => {
      if (mounted) setQrUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-[#eef2f7] p-3 shadow-inner ring-1 ring-black/5 sm:p-5 dark:bg-[#17191d] dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between px-1 text-[#3c4043] dark:text-[#e8eaed]">
        <span className="text-sm font-semibold">Tarjeta de sellos</span>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide dark:bg-white/10">
          Vista previa
        </span>
      </div>
      <div className="overflow-hidden rounded-[1.35rem] bg-white text-black shadow-xl ring-1 ring-black/10">
        <div
          className="flex items-center gap-3 p-5"
          style={{ backgroundColor: design.backgroundColor, color: textColor }}
        >
          <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/90 text-sm font-bold text-neutral-900">
            {design.logoUrl ? (
              <img
                src={design.logoUrl}
                alt="Logo del programa"
                className="size-full object-contain p-1"
              />
            ) : (
              (design.programName || issuerName).slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs opacity-70">{issuerName}</p>
            <p className="truncate font-semibold">{design.programName || issuerName}</p>
          </div>
        </div>
        <div
          className="grid gap-3 p-5 sm:gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(5, stampTarget)}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: stampTarget }, (_, index) => {
            const filled = index < completed;
            return (
              <div
                key={index}
                className="grid aspect-square place-items-center rounded-full border-2 text-lg font-bold sm:text-xl"
                style={{
                  borderColor: design.stampColor,
                  backgroundColor: filled ? design.stampColor : "transparent",
                  color: filled ? walletContrastColor(design.stampColor) : design.stampColor,
                }}
              >
                <StampIcon className="size-5" strokeWidth={2} />
              </div>
            );
          })}
        </div>
        <div className="flex items-end justify-between gap-4 border-t px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recompensa
            </p>
            <p className="mt-1 font-semibold">{design.stampReward || "1 café"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sellos
            </p>
            <p className="mt-1 font-semibold">
              {completed} / {stampTarget}
            </p>
          </div>
        </div>
        <div className="flex justify-center border-t p-5">
          <div className="rounded-xl bg-white p-2 ring-1 ring-black/5">
            {qrUrl ? (
              <img src={qrUrl} alt="Código QR de ejemplo" className="size-28" />
            ) : (
              <QrCode className="size-28" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleWalletPreview({ design, issuerName }: { design: WalletDesign; issuerName: string }) {
  const [qrUrl, setQrUrl] = useState("");
  const textColor = walletContrastColor(design.backgroundColor);
  const subduedText = textColor === "#FFFFFF" ? "rgba(255,255,255,.72)" : "rgba(0,0,0,.62)";

  useEffect(() => {
    let mounted = true;
    void qrPngDataUrl("F7D4K2", "#000000").then((url) => {
      if (mounted) setQrUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-[#eef2f7] p-3 shadow-inner ring-1 ring-black/5 sm:p-5 dark:bg-[#17191d] dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between px-1 text-[#3c4043] dark:text-[#e8eaed]">
        <span className="text-sm font-semibold">Google Wallet</span>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide dark:bg-white/10">
          Datos de ejemplo
        </span>
      </div>
      <div
        className="overflow-hidden rounded-[1.35rem] shadow-xl ring-1 ring-black/10"
        style={{ backgroundColor: design.backgroundColor, color: textColor }}
      >
        <div className="flex items-center gap-3 p-5 pb-4">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 ring-1 ring-black/5">
            {design.logoUrl ? (
              <img
                src={design.logoUrl}
                alt="Vista previa del logotipo del programa"
                className="size-full object-contain p-1.5"
              />
            ) : (
              <span className="text-lg font-bold text-neutral-800">
                {(design.programName || issuerName || "F").trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-medium" style={{ color: subduedText }}>
              {issuerName}
            </p>
            <p className="mt-1 truncate text-base font-semibold">
              {design.programName || issuerName}
            </p>
          </div>
          <EllipsisVertical className="size-5 shrink-0 opacity-70" aria-hidden />
        </div>

        <div className="px-5 pb-5 pt-2">
          <p
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: subduedText }}
          >
            {design.pointsLabel || "Puntos"}
          </p>
          <p className="mt-0.5 text-3xl font-semibold leading-none">320</p>
        </div>

        <div className="flex flex-col items-center px-5 py-5">
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            {qrUrl ? (
              <img src={qrUrl} alt="Código QR de ejemplo del pase" className="size-28" />
            ) : (
              <QrCode className="size-28 text-black" strokeWidth={1.5} />
            )}
          </div>
          <p className="mt-2 font-mono text-xs font-medium tracking-[.18em]">F7D4K2</p>
        </div>

        {design.heroUrl ? (
          <img
            src={design.heroUrl}
            alt="Vista previa de la imagen principal del pase"
            className="aspect-[1032/336] w-full object-cover"
          />
        ) : null}

        <div className="grid grid-cols-2 gap-4 p-5">
          <WalletField label="Cliente" value="Lucía García" subduedColor={subduedText} />
          <WalletField
            label="N.º de socio"
            value="…7F2A"
            subduedColor={subduedText}
            align="right"
          />
        </div>
      </div>
      <div className="mx-auto mt-3 h-1.5 w-28 rounded-full bg-[#3c4043]/20 dark:bg-white/20" />
    </div>
  );
}

function WalletField({
  label,
  value,
  subduedColor,
  align = "left",
}: {
  label: string;
  value: string;
  subduedColor: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p
        className="text-[10px] font-medium uppercase tracking-wide"
        style={{ color: subduedColor }}
      >
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function AppleWalletPreview({ design }: { design: WalletDesign }) {
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-[1.65rem] shadow-2xl ring-1 ring-black/10">
      <div
        className="relative min-h-[26rem] overflow-hidden p-6"
        style={{ backgroundColor: design.backgroundColor, color: design.textColor }}
      >
        <div className="flex min-h-12 items-center justify-between gap-4">
          {design.logoUrl ? (
            <img
              src={design.logoUrl}
              alt="Vista previa del logotipo"
              className="max-h-12 max-w-36 object-contain object-left"
            />
          ) : (
            <span className="font-display text-xl font-bold">
              {design.programName || "Fideleo"}
            </span>
          )}
          <span className="text-right text-xs font-semibold opacity-75">Tarjeta de fidelidad</span>
        </div>
        {design.heroUrl ? (
          <img
            src={design.heroUrl}
            alt="Vista previa de la imagen destacada"
            className="mt-5 h-32 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="mt-5 h-32 rounded-2xl bg-white/15" />
        )}
        <div className="mt-6 flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[.14em] opacity-65">
              {design.pointsLabel || "Puntos"}
            </p>
            <p className="mt-1 text-4xl font-bold">6 / 10</p>
          </div>
          <div className="rounded-xl bg-white p-2 text-black">
            <QrCode className="size-16" strokeWidth={1.6} />
          </div>
        </div>
        <div className="mt-7 border-t border-current/20 pt-4">
          <p className="text-xs uppercase tracking-[.14em] opacity-65">Cliente</p>
          <p className="mt-1 font-semibold">Lucía García</p>
        </div>
      </div>
    </div>
  );
}

function walletContrastColor(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#FFFFFF";
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? "#202124" : "#FFFFFF";
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
