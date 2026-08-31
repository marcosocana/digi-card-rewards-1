import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, ExternalLink, ImagePlus, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";
import { loyaltyModuleTabs, ModuleTabs } from "@/components/app/module-tabs";
import { PageHeader } from "@/components/app/page-header";
import { PublicClubExperience } from "@/components/app/public-club-experience";
import {
  ProgramMechanicSwitch,
  type ProgramMechanic,
} from "@/components/app/program-mechanic-switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { setProgramMechanic } from "@/lib/loyalty-program";
import { downloadDataUrl, qrPngDataUrl } from "@/lib/qr";
import { getCaptureUrl } from "@/lib/public-url";
import { useAdminScope } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/panel/captacion")({
  component: CaptacionPage,
});

const emptyBranding = {
  primary_color: "#111111",
  secondary_color: "#f8b9e7",
  background_color: "#f5f5f4",
  text_color: "#111111",
  logo_url: "",
  cover_url: "",
  welcome_message: "",
  program_description: "",
};

function CaptacionPage() {
  const { session, organizationId: orgId, selectedLocationIds } = useAdminScope();
  const locationId = selectedLocationIds.length === 1 ? selectedLocationIds[0] : null;
  const [branding, setBranding] = useState(emptyBranding);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"logo_url" | "cover_url" | null>(null);
  const [previewAssets, setPreviewAssets] = useState<
    Partial<Pick<typeof emptyBranding, "logo_url" | "cover_url">>
  >({});
  const hydrated = useRef(false);
  const lastSaved = useRef("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["capture-page", orgId, locationId],
    enabled: Boolean(session && orgId && locationId),
    queryFn: async () => {
      const [location, program, brandingResult] = await Promise.all([
        supabase
          .from("locations")
          .select("id,name,slug,organizations!inner(slug,display_name,status)")
          .eq("id", locationId!)
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .eq("organizations.status", "active")
          .single(),
        supabase
          .from("loyalty_programs")
          .select("id,mechanic_type,program_locations!inner(location_id)")
          .eq("organization_id", orgId!)
          .eq("program_locations.location_id", locationId!)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("organization_branding")
          .select(
            "primary_color,secondary_color,background_color,text_color,logo_url,cover_url,welcome_message,program_description",
          )
          .eq("organization_id", orgId!)
          .maybeSingle(),
      ]);
      if (location.error) throw location.error;
      if (program.error) throw program.error;
      if (brandingResult.error) throw brandingResult.error;
      return { location: location.data, program: program.data, branding: brandingResult.data };
    },
  });

  const organization = data?.location.organizations as {
    slug: string;
    display_name: string;
  } | null;
  const captureUrl = data ? getCaptureUrl(organization?.slug ?? "", data.location.slug) : "";
  const mechanic: ProgramMechanic = data?.program?.mechanic_type === "stamps" ? "stamps" : "points";

  useEffect(() => {
    if (!data) return;
    const nextBranding = {
      primary_color: data.branding?.primary_color ?? emptyBranding.primary_color,
      secondary_color: data.branding?.secondary_color ?? emptyBranding.secondary_color,
      background_color: data.branding?.background_color ?? emptyBranding.background_color,
      text_color: data.branding?.text_color ?? emptyBranding.text_color,
      logo_url: data.branding?.logo_url ?? "",
      cover_url: data.branding?.cover_url ?? "",
      welcome_message: data.branding?.welcome_message ?? "",
      program_description: data.branding?.program_description ?? "",
    };
    lastSaved.current = JSON.stringify(nextBranding);
    hydrated.current = true;
    setBranding(nextBranding);
  }, [data]);

  useEffect(() => {
    if (!captureUrl) {
      setCode("");
      return;
    }
    void qrPngDataUrl(captureUrl).then(setCode);
  }, [captureUrl]);

  const changeMechanic = async (next: ProgramMechanic) => {
    if (!data?.program || !locationId || next === mechanic) return;
    setSwitching(true);
    try {
      await setProgramMechanic(data.program.id, locationId, next);
      toast.success(
        next === "stamps" ? "Programa cambiado a Sellos" : "Programa cambiado a Puntos",
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

  const uploadBrandAsset = async (file: File, kind: "logo_url" | "cover_url") => {
    if (!orgId) return;
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      toast.error("Formato no compatible", { description: "Utiliza una imagen PNG, JPG o WebP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewAssets((current) => {
      const previous = current[kind];
      if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
      return { ...current, [kind]: objectUrl };
    });
    setUploadingAsset(kind);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const assetName = kind === "logo_url" ? "logo" : "cover";
    const path = `${orgId}/${assetName}-${crypto.randomUUID()}.${extension}`;
    const uploaded = await supabase.storage.from("brand-assets").upload(path, file, {
      contentType: file.type,
    });
    if (uploaded.error) {
      setUploadingAsset(null);
      URL.revokeObjectURL(objectUrl);
      setPreviewAssets((current) => ({ ...current, [kind]: undefined }));
      toast.error("No se pudo subir la imagen", { description: uploaded.error.message });
      return;
    }
    const publishedUrl = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
    const nextBranding = { ...branding, [kind]: publishedUrl };
    const persisted = await supabase.from("organization_branding").upsert({
      organization_id: orgId,
      ...nextBranding,
      logo_url: nextBranding.logo_url || null,
      cover_url: nextBranding.cover_url || null,
      welcome_message: nextBranding.welcome_message || null,
      program_description: nextBranding.program_description || null,
    });
    if (persisted.error) {
      setUploadingAsset(null);
      URL.revokeObjectURL(objectUrl);
      setPreviewAssets((current) => ({ ...current, [kind]: undefined }));
      toast.error("No se pudo guardar la imagen", { description: persisted.error.message });
      return;
    }
    const preload = new Image();
    preload.src = publishedUrl;
    await preload.decode().catch(() => undefined);
    lastSaved.current = JSON.stringify(nextBranding);
    setBranding(nextBranding);
    setPreviewAssets((current) => ({ ...current, [kind]: undefined }));
    setUploadingAsset(null);
    URL.revokeObjectURL(objectUrl);
    toast.success("Imagen guardada y publicada");
  };

  const save = async (snapshot = branding) => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase.from("organization_branding").upsert({
      organization_id: orgId,
      ...snapshot,
      logo_url: snapshot.logo_url || null,
      cover_url: snapshot.cover_url || null,
      welcome_message: snapshot.welcome_message || null,
      program_description: snapshot.program_description || null,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo publicar la página", { description: error.message });
      return;
    }
    lastSaved.current = JSON.stringify(snapshot);
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!hydrated.current || !data || uploadingAsset !== null) return;
    const serialized = JSON.stringify(branding);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => void saveRef.current(branding), 700);
    return () => window.clearTimeout(timer);
  }, [branding, data, uploadingAsset]);

  if (!locationId) {
    return (
      <>
        <PageHeader
          title="Programa de fidelización"
          description="Configura el programa de un establecimiento."
        />
        <AdminScopeNotice action="configurar su página de captación" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Programa de fidelización"
        actions={
          <span className="text-sm text-muted-foreground">
            {uploadingAsset !== null
              ? "Subiendo imagen…"
              : saving
                ? "Guardando…"
                : "Guardado automático"}
          </span>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <>
          {data?.program ? (
            <ProgramMechanicSwitch
              value={mechanic}
              onChange={(next) => void changeMechanic(next)}
              disabled={switching}
            />
          ) : null}
          <ModuleTabs tabs={loyaltyModuleTabs} />
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,.82fr)_minmax(28rem,1.18fr)]">
            <div className="min-w-0 space-y-5">
              <BrandingEditor
                branding={branding}
                setBranding={setBranding}
                uploadingAsset={uploadingAsset}
                uploadBrandAsset={uploadBrandAsset}
                clearPreviewAsset={(kind) =>
                  setPreviewAssets((current) => {
                    const previous = current[kind];
                    if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
                    return { ...current, [kind]: undefined };
                  })
                }
              />
              <section className="surface flex min-w-0 flex-col items-center gap-3 p-5 text-center">
                <h2 className="font-display text-lg font-semibold">QR de captación</h2>
                <p className="text-sm text-muted-foreground">{data?.location.name}</p>
                {code ? (
                  <img
                    src={code}
                    alt={`QR de alta para ${data?.location.name ?? "el establecimiento"}`}
                    className="size-44 border"
                  />
                ) : (
                  <Skeleton className="size-44 rounded-lg" />
                )}
                <a
                  href={captureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-full break-all text-xs text-muted-foreground underline underline-offset-2"
                >
                  {captureUrl}
                </a>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={captureUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> Abrir
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(captureUrl);
                      toast.success("Enlace copiado");
                    }}
                  >
                    <Copy className="size-4" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!code}
                    onClick={() =>
                      downloadDataUrl(code, `qr-${data?.location.slug ?? "captacion"}.png`)
                    }
                  >
                    <Download className="size-4" /> Descargar
                  </Button>
                </div>
              </section>
            </div>

            <section className="min-w-0 xl:sticky xl:top-24 xl:self-start">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold">Vista previa real</h2>
                  <p className="text-xs text-muted-foreground">
                    Muestra exactamente la landing publicada.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={captureUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> Abrir landing
                  </a>
                </Button>
              </div>
              <div className="surface min-w-0 overflow-hidden p-2">
                {organization?.slug ? (
                  <div className="h-[760px] overflow-y-auto overscroll-contain bg-white">
                    <PublicClubExperience
                      organizationSlug={organization.slug}
                      locationSlug={data?.location.slug}
                      brandingOverride={{ ...branding, ...previewAssets }}
                    />
                  </div>
                ) : (
                  <Skeleton className="h-[760px] w-full" />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

type Branding = typeof emptyBranding;

function BrandingEditor({
  branding,
  setBranding,
  uploadingAsset,
  uploadBrandAsset,
  clearPreviewAsset,
}: {
  branding: Branding;
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  uploadingAsset: "logo_url" | "cover_url" | null;
  uploadBrandAsset: (file: File, kind: "logo_url" | "cover_url") => Promise<void>;
  clearPreviewAsset: (kind: "logo_url" | "cover_url") => void;
}) {
  const colors = [
    ["primary_color", "Color principal"],
    ["secondary_color", "Color secundario"],
    ["background_color", "Color de fondo"],
    ["text_color", "Color de texto"],
  ] as const;
  const assets = [
    ["logo_url", "Logo", "Se mostrará sobre la portada"],
    ["cover_url", "Imagen de portada", "Recomendado: formato horizontal"],
  ] as const;

  return (
    <section className="surface grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="font-display text-lg font-semibold">Branding</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personaliza la landing que se abre al escanear el QR.
        </p>
      </div>
      {colors.map(([key, label]) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            type="color"
            value={branding[key]}
            onChange={(event) =>
              setBranding((current) => ({ ...current, [key]: event.target.value }))
            }
          />
        </div>
      ))}
      {assets.map(([kind, label, help]) => (
        <div key={kind} className="space-y-2 sm:col-span-2">
          <Label htmlFor={`capture-${kind}`}>{label}</Label>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
            <Input
              id={`capture-${kind}`}
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
            <Button asChild type="button" variant="outline" disabled={uploadingAsset !== null}>
              <label htmlFor={`capture-${kind}`} className="cursor-pointer">
                {uploadingAsset === kind ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {uploadingAsset === kind
                  ? "Subiendo…"
                  : branding[kind]
                    ? `Cambiar ${label.toLowerCase()}`
                    : `Seleccionar ${label.toLowerCase()}`}
              </label>
            </Button>
            {branding[kind] ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearPreviewAsset(kind);
                  setBranding((current) => ({ ...current, [kind]: "" }));
                }}
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
        <Label htmlFor="capture-welcome">Mensaje de bienvenida</Label>
        <Textarea
          id="capture-welcome"
          value={branding.welcome_message}
          onChange={(event) =>
            setBranding((current) => ({ ...current, welcome_message: event.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="capture-description">Descripción pública del club</Label>
        <Textarea
          id="capture-description"
          value={branding.program_description}
          onChange={(event) =>
            setBranding((current) => ({ ...current, program_description: event.target.value }))
          }
        />
      </div>
    </section>
  );
}
