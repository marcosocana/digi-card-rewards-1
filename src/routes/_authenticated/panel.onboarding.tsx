import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { downloadDataUrl, qrPngDataUrl } from "@/lib/qr";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getSubscriptionPlan } from "@/lib/subscription-plans";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/panel/onboarding")({
  component: OnboardingPage,
});

const labels = ["Negocio y locales", "Identidad", "Programa", "Tarjeta", "Publicación"];

type LocationForm = {
  id?: string;
  name: string;
  addressLine: string;
  city: string;
  postalCode: string;
};

const emptyLocation = (): LocationForm => ({
  name: "",
  addressLine: "",
  city: "",
  postalCode: "",
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function OnboardingPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const locationLimit = getSubscriptionPlan(session?.planCode)?.maxLocations ?? 1;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState("");
  const [ids, setIds] = useState({ program: "", campaign: "", slug: "" });
  const [locations, setLocations] = useState<LocationForm[]>([emptyLocation()]);
  const [form, setForm] = useState({
    displayName: "",
    category: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    primary: "#3B2415",
    secondary: "#D4A574",
    background: "#FBF7F0",
    text: "#1F1A16",
    logo: "",
    cover: "",
    programName: "",
    programDescription: "",
    mechanic: "spend",
    terms: "",
    walletHeadline: "Tu fidelidad, siempre contigo",
  });

  useEffect(() => {
    if (!orgId) return;
    void (async () => {
      const [organization, branding, program, campaign, savedLocations] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).single(),
        supabase
          .from("organization_branding")
          .select("*")
          .eq("organization_id", orgId)
          .maybeSingle(),
        supabase
          .from("loyalty_programs")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("campaigns")
          .select("id")
          .eq("organization_id", orgId)
          .order("created_at")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("locations")
          .select("id, name, address_line, city, postal_code")
          .eq("organization_id", orgId)
          .is("archived_at", null)
          .order("created_at"),
      ]);
      if (organization.error || program.error || savedLocations.error) {
        toast.error("No se pudo cargar el onboarding");
        setLoading(false);
        return;
      }
      const org = organization.data;
      const brand = branding.data;
      const loyalty = program.data;
      setStep(org.onboarding_completed_at ? 5 : (org.onboarding_step ?? 1));
      setIds({ program: loyalty?.id ?? "", campaign: campaign.data?.id ?? "", slug: org.slug });
      setLocations(
        savedLocations.data?.length
          ? savedLocations.data.map((location) => ({
              id: location.id,
              name: location.name,
              addressLine: location.address_line ?? "",
              city: location.city ?? "",
              postalCode: location.postal_code ?? "",
            }))
          : [emptyLocation()],
      );
      setForm((current) => ({
        ...current,
        displayName: org.display_name ?? "",
        category: org.category ?? "",
        address: org.address_line ?? "",
        phone: org.contact_phone ?? "",
        email: org.contact_email ?? "",
        website: org.website ?? "",
        instagram: org.instagram ?? "",
        primary: brand?.primary_color ?? current.primary,
        secondary: brand?.secondary_color ?? current.secondary,
        background: brand?.background_color ?? current.background,
        text: brand?.text_color ?? current.text,
        logo: brand?.logo_url ?? "",
        cover: brand?.cover_url ?? "",
        programName: loyalty?.public_name ?? "",
        programDescription: loyalty?.description ?? "",
        mechanic: loyalty?.mechanic_type ?? "spend",
        terms: loyalty?.terms ?? "",
      }));
      setLoading(false);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!ids.slug || typeof window === "undefined") return;
    void qrPngDataUrl(`${window.location.origin}/club/${ids.slug}`).then(setQr);
  }, [ids.slug]);

  const upload = async (file: File, kind: "logo" | "cover") => {
    if (!orgId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5 MB");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${orgId}/${kind}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, {
      contentType: file.type,
    });
    if (error) {
      toast.error("No se pudo subir la imagen", { description: error.message });
      return;
    }
    const { data: signed, error: signError } = await supabase.storage
      .from("brand-assets")
      .createSignedUrl(path, 31_536_000);
    if (signError) {
      toast.error("No se pudo preparar la imagen", { description: signError.message });
      return;
    }
    setForm((current) => ({ ...current, [kind]: signed.signedUrl }));
    toast.success("Imagen subida");
  };

  const saveStep = async (next = true) => {
    if (!orgId) return;
    setSaving(true);
    let error: { message: string } | null = null;
    if (step === 1) {
      if (form.displayName.trim().length < 2 || !form.email.includes("@")) {
        setSaving(false);
        {
          toast.error("Completa el nombre y un email válido");
          return;
        }
      }
      if (
        !locations.length ||
        locations.length > locationLimit ||
        locations.some((location) => location.name.trim().length < 2)
      ) {
        setSaving(false);
        toast.error(
          `Añade entre 1 y ${locationLimit} establecimiento${locationLimit === 1 ? "" : "s"} con un nombre válido`,
        );
        return;
      }
      const organizationResponse = await supabase
        .from("organizations")
        .update({
          display_name: form.displayName.trim(),
          category: form.category || null,
          address_line: form.address || null,
          contact_phone: form.phone || null,
          contact_email: form.email.trim(),
          website: form.website || null,
          instagram: form.instagram || null,
        })
        .eq("id", orgId);
      error = organizationResponse.error;

      const persistedLocations = [...locations];
      for (let index = 0; index < persistedLocations.length && !error; index += 1) {
        const location = persistedLocations[index];
        if (!location) continue;
        const response = await supabase.rpc("save_onboarding_location", {
          _organization_id: orgId,
          _location_id: location.id ?? null,
          _name: location.name.trim(),
          _slug: location.id
            ? slugify(location.name) || "local"
            : `${slugify(location.name) || "local"}-${crypto.randomUUID().slice(0, 6)}`,
          _address_line: location.addressLine,
          _city: location.city,
          _postal_code: location.postalCode,
        });
        error = response.error;
        if (!response.data || error) continue;
        persistedLocations[index] = { ...location, id: response.data };
      }
      if (!error) {
        setLocations(persistedLocations);
        const progress = await supabase
          .from("organizations")
          .update({ onboarding_step: 2 })
          .eq("id", orgId);
        error = progress.error;
      }
    } else if (step === 2) {
      const response = await supabase.from("organization_branding").upsert({
        organization_id: orgId,
        primary_color: form.primary,
        secondary_color: form.secondary,
        background_color: form.background,
        text_color: form.text,
        logo_url: form.logo || null,
        cover_url: form.cover || null,
      });
      error = response.error;
      if (!error)
        await supabase.from("organizations").update({ onboarding_step: 3 }).eq("id", orgId);
    } else if (step === 3 && ids.program) {
      const response = await supabase
        .from("loyalty_programs")
        .update({
          public_name: form.programName.trim(),
          description: form.programDescription || null,
          mechanic_type: form.mechanic,
          terms: form.terms || null,
        })
        .eq("id", ids.program);
      error = response.error;
      if (!error)
        await supabase.from("organizations").update({ onboarding_step: 4 }).eq("id", orgId);
    } else if (step === 4) {
      const response = await supabase.from("organization_branding").upsert({
        organization_id: orgId,
        program_description: form.walletHeadline,
      });
      error = response.error;
      if (!error)
        await supabase.from("organizations").update({ onboarding_step: 5 }).eq("id", orgId);
    } else if (step === 5) {
      const responses = await Promise.all([
        supabase
          .from("organizations")
          .update({
            status: "active",
            onboarding_step: 5,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("id", orgId),
        ids.program
          ? supabase.from("loyalty_programs").update({ status: "active" }).eq("id", ids.program)
          : Promise.resolve({ error: null }),
        ids.campaign
          ? supabase
              .from("campaigns")
              .update({ status: "active", is_primary: true })
              .eq("id", ids.campaign)
          : Promise.resolve({ error: null }),
      ]);
      error = responses.find((response) => response.error)?.error ?? null;
    }
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success(step === 5 ? "Programa publicado" : "Borrador guardado");
    if (next && step < 5) setStep(step + 1);
  };

  if (loading) return <Skeleton className="h-[32rem] rounded-xl" />;
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const publicUrl =
    typeof window === "undefined"
      ? `/club/${ids.slug}`
      : `${window.location.origin}/club/${ids.slug}`;

  return (
    <>
      <PageHeader
        title="Publicar tu club"
        description="Configura y previsualiza el programa en cinco pasos. Puedes continuar más tarde."
      />
      <ol className="grid grid-cols-5 gap-1" aria-label="Progreso del onboarding">
        {labels.map((label, index) => (
          <li
            key={label}
            className={`rounded-lg px-2 py-2 text-center text-xs ${step === index + 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <span className="hidden sm:inline">{index + 1}. </span>
            {label}
          </li>
        ))}
      </ol>
      <section className="surface p-5 sm:p-7">
        {step === 1 ? (
          <BusinessStep
            form={form}
            set={set}
            locations={locations}
            setLocations={setLocations}
            locationLimit={locationLimit}
            planName={getSubscriptionPlan(session?.planCode)?.name ?? "tu plan"}
          />
        ) : null}
        {step === 2 ? <BrandStep form={form} set={set} upload={upload} /> : null}
        {step === 3 ? <ProgramStep form={form} set={set} /> : null}
        {step === 4 ? <WalletStep form={form} set={set} /> : null}
        {step === 5 ? <PublishStep form={form} url={publicUrl} qr={qr} /> : null}
        <div className="mt-7 flex flex-wrap justify-between gap-2 border-t pt-5">
          <Button
            variant="outline"
            disabled={step === 1 || saving}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft className="size-4" /> Anterior
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={saving} onClick={() => void saveStep(false)}>
              Guardar borrador
            </Button>
            <Button disabled={saving} onClick={() => void saveStep()}>
              {step === 5 ? <Check className="size-4" /> : null}
              {saving ? "Guardando…" : step === 5 ? "Publicar" : "Guardar y continuar"}
              {step < 5 ? <ChevronRight className="size-4" /> : null}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

type Form = ReturnType<typeof useOnboardingFormShape>;
function useOnboardingFormShape() {
  return {
    displayName: "",
    category: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    primary: "",
    secondary: "",
    background: "",
    text: "",
    logo: "",
    cover: "",
    programName: "",
    programDescription: "",
    mechanic: "",
    terms: "",
    walletHeadline: "",
  };
}
type Setter = (key: keyof Form, value: string) => void;

function BusinessStep({
  form,
  set,
  locations,
  setLocations,
  locationLimit,
  planName,
}: {
  form: Form;
  set: Setter;
  locations: LocationForm[];
  setLocations: Dispatch<SetStateAction<LocationForm[]>>;
  locationLimit: number;
  planName: string;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Información del negocio</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(
          [
            ["displayName", "Nombre comercial", "text"],
            ["category", "Categoría", "text"],
            ["address", "Dirección", "text"],
            ["phone", "Teléfono", "tel"],
            ["email", "Email", "email"],
            ["website", "Web", "url"],
            ["instagram", "Instagram", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`ob-${key}`}>{label}</Label>
            <Input
              id={`ob-${key}`}
              type={type}
              value={form[key]}
              onChange={(event) => set(key, event.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-8 border-t pt-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Building2 className="size-5" /> Establecimientos
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan {planName}: {locations.length} de {locationLimit} establecimiento
              {locationLimit === 1 ? "" : "s"} configurados.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={locations.length >= locationLimit}
            onClick={() => setLocations((current) => [...current, emptyLocation()])}
          >
            <Plus className="size-4" /> Añadir establecimiento
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {locations.map((location, index) => (
            <div key={location.id ?? index} className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Establecimiento {index + 1}</p>
                {!location.id && locations.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLocations((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <X className="size-4" /> Quitar
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["name", "Nombre"],
                    ["addressLine", "Dirección"],
                    ["city", "Ciudad"],
                    ["postalCode", "Código postal"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`location-${index}-${key}`}>{label}</Label>
                    <Input
                      id={`location-${index}-${key}`}
                      value={location[key]}
                      onChange={(event) =>
                        setLocations((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, [key]: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandStep({
  form,
  set,
  upload,
}: {
  form: Form;
  set: Setter;
  upload: (file: File, kind: "logo" | "cover") => Promise<void>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-xl font-semibold">Identidad visual</h2>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {(
            [
              ["primary", "Principal"],
              ["secondary", "Secundario"],
              ["background", "Fondo"],
              ["text", "Texto"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`ob-${key}`}>{label}</Label>
              <Input
                id={`ob-${key}`}
                type="color"
                value={form[key]}
                onChange={(event) => set(key, event.target.value)}
              />
            </div>
          ))}
          {(["logo", "cover"] as const).map((kind) => (
            <div key={kind} className="col-span-2 space-y-1.5">
              <Label htmlFor={`ob-${kind}`}>{kind === "logo" ? "Logo" : "Imagen principal"}</Label>
              <Input
                id={`ob-${kind}`}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file, kind);
                }}
              />
              <p className="text-xs text-muted-foreground">
                <Upload className="mr-1 inline size-3" />
                PNG, JPG, WebP o SVG · máximo 5 MB
              </p>
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: form.background, color: form.text }}
      >
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: form.primary, color: form.background }}
        >
          {form.logo ? (
            <img
              src={form.logo}
              alt="Vista previa del logo"
              className="mb-8 h-12 max-w-40 object-contain"
            />
          ) : null}
          <p className="text-sm opacity-75">Vista previa en tiempo real</p>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            {form.displayName || "Tu negocio"}
          </h3>
          <div className="mt-8 h-2 rounded-full bg-white/25">
            <div
              className="h-full w-2/3 rounded-full"
              style={{ backgroundColor: form.secondary }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramStep({ form, set }: { form: Form; set: Setter }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Programa de fidelización</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ob-program">Nombre público</Label>
          <Input
            id="ob-program"
            value={form.programName}
            onChange={(event) => set("programName", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mecánica principal</Label>
          <Select value={form.mechanic} onValueChange={(value) => set("mechanic", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">Acumulación por gasto</SelectItem>
              <SelectItem value="points">Puntos</SelectItem>
              <SelectItem value="stamps">Sellos</SelectItem>
              <SelectItem value="cashback">Cashback</SelectItem>
              <SelectItem value="membership">Membresía</SelectItem>
              <SelectItem value="coupon">Cupón</SelectItem>
              <SelectItem value="gift_card">Tarjeta regalo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ob-description">Descripción</Label>
          <Textarea
            id="ob-description"
            value={form.programDescription}
            onChange={(event) => set("programDescription", event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ob-terms">Condiciones y texto legal</Label>
          <Textarea
            id="ob-terms"
            rows={5}
            value={form.terms}
            onChange={(event) => set("terms", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function WalletStep({ form, set }: { form: Form; set: Setter }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-xl font-semibold">Tarjeta digital</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La tarjeta web está activa. Apple y Google Wallet permanecerán en modo demo identificado
          hasta configurar sus credenciales backend.
        </p>
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="ob-wallet">Texto destacado</Label>
          <Input
            id="ob-wallet"
            value={form.walletHeadline}
            onChange={(event) => set("walletHeadline", event.target.value)}
          />
        </div>
      </div>
      <div className="rounded-2xl bg-black p-3">
        <div
          className="min-h-64 rounded-xl p-6"
          style={{ backgroundColor: form.primary, color: form.background }}
        >
          <p className="text-sm opacity-75">{form.programName}</p>
          <h3 className="mt-2 font-display text-2xl font-semibold">{form.walletHeadline}</h3>
          <p className="mt-20 text-sm">Apple Wallet · Vista previa</p>
          <p className="mt-1 text-xs opacity-75">Modo demo · credenciales pendientes</p>
        </div>
      </div>
    </div>
  );
}

function PublishStep({ form, url, qr }: { form: Form; url: string; qr: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-xl font-semibold">Resumen y publicación</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Negocio</dt>
            <dd className="font-medium">{form.displayName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Programa</dt>
            <dd className="font-medium">{form.programName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Landing pública</dt>
            <dd className="break-all font-mono text-xs">{url}</dd>
          </div>
        </dl>
      </div>
      <div className="text-center">
        {qr ? (
          <img
            src={qr}
            alt="QR público de captación"
            className="mx-auto size-52 rounded-xl border"
          />
        ) : (
          <Skeleton className="mx-auto size-52" />
        )}
        <Button
          className="mt-3"
          variant="outline"
          disabled={!qr}
          onClick={() =>
            downloadDataUrl(
              qr,
              `qr-club-${form.displayName.toLowerCase().replace(/\s+/g, "-")}.png`,
            )
          }
        >
          <Download className="size-4" /> Descargar QR
        </Button>
      </div>
    </div>
  );
}
