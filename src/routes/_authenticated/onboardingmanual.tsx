import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronLeft, ChevronRight, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSessionInfo, sessionQueryKey } from "@/lib/session";
import { subscriptionPlans, type SubscriptionPlanCode } from "@/lib/subscription-plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboardingmanual")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: sessionQueryKey,
      queryFn: fetchSessionInfo,
    });
    if (!session?.isSuperadmin) throw redirect({ to: "/panel" });
  },
  component: ManualOnboardingPage,
});

type LocationForm = { name: string; addressLine: string; city: string; postalCode: string };
const emptyLocation = (): LocationForm => ({ name: "", addressLine: "", city: "", postalCode: "" });
const labels = ["Plan", "Negocio y locales", "Identidad", "Programa", "Tarjeta", "Usuario"];

function ManualOnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [locationErrors, setLocationErrors] = useState<LocationErrors>({});
  const [planCode, setPlanCode] = useState<SubscriptionPlanCode>("basic");
  const [locations, setLocations] = useState<LocationForm[]>([emptyLocation()]);
  const [form, setForm] = useState({
    displayName: "",
    legalName: "",
    category: "",
    address: "",
    city: "",
    postalCode: "",
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
    mechanic: "points",
    terms: "",
    walletHeadline: "Tu fidelidad, siempre contigo",
    ownerName: "",
    ownerEmail: "",
    password: "",
    passwordConfirmation: "",
  });
  const plan = subscriptionPlans.find((item) => item.code === planCode)!;
  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const image = (file: File, key: "logo" | "cover") => {
    if (file.size > 3 * 1024 * 1024) return toast.error("La imagen no puede superar 3 MB");
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const valid = () => {
    const nextFieldErrors: FieldErrors = {};
    const nextLocationErrors: LocationErrors = {};

    if (step === 2) {
      if (form.displayName.trim().length < 2)
        nextFieldErrors.displayName = "Introduce el nombre comercial";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        nextFieldErrors.email = "Introduce un email válido";
      locations.forEach((location, index) => {
        if (location.name.trim().length < 2) {
          nextLocationErrors[index] = { name: "Introduce el nombre del establecimiento" };
        }
      });
    }
    if (step === 4 && form.programName.trim().length < 2) {
      nextFieldErrors.programName = "Indica el nombre público del programa";
    }
    if (step === 6) {
      if (form.ownerName.trim().length < 2)
        nextFieldErrors.ownerName = "Introduce el nombre del administrador";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail.trim()))
        nextFieldErrors.ownerEmail = "Introduce un email válido";
      if (form.password.length < 8)
        nextFieldErrors.password = "La contraseña debe tener al menos 8 caracteres";
      if (!form.passwordConfirmation) nextFieldErrors.passwordConfirmation = "Repite la contraseña";
      else if (form.password !== form.passwordConfirmation)
        nextFieldErrors.passwordConfirmation = "Las contraseñas no coinciden";
    }

    setFieldErrors(nextFieldErrors);
    setLocationErrors(nextLocationErrors);
    if (Object.keys(nextFieldErrors).length || Object.keys(nextLocationErrors).length) {
      toast.error("Completa los campos obligatorios marcados en rojo");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!valid()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean;
        code?: string;
        error?: string;
        emailSent?: boolean;
      }>("admin-provision-company", {
        body: { planCode, locations, ...form },
      });
      let description = data?.error || error?.message;
      if (error && "context" in error && error.context instanceof Response) {
        try {
          const response = (await error.context.clone().json()) as { error?: string };
          description = response.error || description;
        } catch {
          // Keep the Functions client message when the response has no JSON body.
        }
      }
      if (error || data?.ok === false || data?.error) {
        toast.error(
          data?.code === "account_exists"
            ? "El email ya está registrado"
            : "No se pudo completar el alta",
          {
            description: description || "Revisa los datos e inténtalo de nuevo.",
            duration: 7000,
          },
        );
        return;
      }
      if (data?.emailSent === false) {
        toast.warning("Empresa y usuario creados, pero el email de confirmación quedó pendiente");
      } else {
        toast.success("Empresa, club y usuario creados", {
          description: "El administrador ha recibido un email de confirmación.",
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["superadmin-organizations"] }),
      ]);
      await navigate({ to: "/panel/empresas" });
    } catch (submitError) {
      toast.error("No se pudo completar el alta", {
        description:
          submitError instanceof Error
            ? submitError.message
            : "Revisa la conexión e inténtalo de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:h-20 sm:px-6">
          <img src="/logo.svg" alt="Fideleo" className="h-7 w-auto dark:hidden" />
          <img src="/logo-dark.svg" alt="Fideleo" className="hidden h-7 w-auto dark:block" />
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Onboarding manual</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura el club y crea su usuario administrador.
          </p>
        </div>
        <ol className="grid grid-cols-6 gap-1" aria-label="Progreso del onboarding">
          {labels.map((label, index) => (
            <li
              key={label}
              className={cn(
                "rounded-lg px-1 py-2 text-center text-[10px] sm:px-2 sm:text-xs",
                step === index + 1
                  ? "bg-primary font-semibold text-primary-foreground"
                  : step > index + 1
                    ? "bg-primary/15"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              <span className="hidden md:inline">{index + 1}. </span>
              {label}
            </li>
          ))}
        </ol>
        <section className="surface p-5 sm:p-7">
          {step === 1 ? (
            <PlanStep
              value={planCode}
              onChange={(code) => {
                setPlanCode(code);
                setLocations((current) =>
                  current.slice(
                    0,
                    subscriptionPlans.find((item) => item.code === code)!.maxLocations,
                  ),
                );
              }}
            />
          ) : null}
          {step === 2 ? (
            <BusinessStep
              form={form}
              set={set}
              locations={locations}
              setLocations={setLocations}
              plan={plan}
              errors={fieldErrors}
              locationErrors={locationErrors}
              clearLocationError={(index, key) =>
                setLocationErrors((current) => {
                  if (!current[index]?.[key]) return current;
                  const next = { ...current, [index]: { ...current[index] } };
                  delete next[index][key];
                  return next;
                })
              }
            />
          ) : null}
          {step === 3 ? <BrandStep form={form} set={set} image={image} /> : null}
          {step === 4 ? <ProgramStep form={form} set={set} errors={fieldErrors} /> : null}
          {step === 5 ? <WalletStep form={form} set={set} /> : null}
          {step === 6 ? (
            <UserStep
              form={form}
              set={set}
              plan={plan}
              locations={locations.length}
              errors={fieldErrors}
            />
          ) : null}
          <div className="mt-7 flex justify-between gap-2 border-t pt-5">
            <Button
              variant="outline"
              disabled={step === 1 || saving}
              onClick={() => setStep((current) => current - 1)}
            >
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            {step < labels.length ? (
              <Button onClick={() => valid() && setStep((current) => current + 1)}>
                Guardar y continuar <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button disabled={saving} onClick={() => void submit()}>
                <Check className="size-4" /> {saving ? "Creando…" : "Crear empresa y usuario"}
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

type Form = ReturnType<typeof formShape>;
const formShape = () => ({
  displayName: "",
  legalName: "",
  category: "",
  address: "",
  city: "",
  postalCode: "",
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
  ownerName: "",
  ownerEmail: "",
  password: "",
  passwordConfirmation: "",
});
type Setter = (key: keyof Form, value: string) => void;
type FieldErrors = Partial<Record<keyof Form, string>>;
type LocationErrors = Partial<Record<number, Partial<Record<keyof LocationForm, string>>>>;

function RequiredLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive">{message}</p> : null;
}

function PlanStep({
  value,
  onChange,
}: {
  value: SubscriptionPlanCode;
  onChange: (code: SubscriptionPlanCode) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Selecciona el plan</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {subscriptionPlans.map((plan) => (
          <button
            key={plan.code}
            type="button"
            onClick={() => onChange(plan.code)}
            className={cn(
              "rounded-2xl border p-5 text-left",
              value === plan.code && "border-primary bg-primary/5 ring-2 ring-primary/20",
            )}
          >
            <div className="flex justify-between">
              <strong className="font-display text-lg">{plan.name}</strong>
              {value === plan.code ? <Check className="size-5 text-primary" /> : null}
            </div>
            <p className="mt-2 text-2xl font-bold">{plan.price}</p>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature}>· {feature}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function BusinessStep({
  form,
  set,
  locations,
  setLocations,
  plan,
  errors,
  locationErrors,
  clearLocationError,
}: {
  form: Form;
  set: Setter;
  locations: LocationForm[];
  setLocations: React.Dispatch<React.SetStateAction<LocationForm[]>>;
  plan: (typeof subscriptionPlans)[number];
  errors: FieldErrors;
  locationErrors: LocationErrors;
  clearLocationError: (index: number, key: keyof LocationForm) => void;
}) {
  const fields = [
    ["displayName", "Nombre comercial"],
    ["legalName", "Razón social"],
    ["category", "Categoría"],
    ["address", "Dirección"],
    ["city", "Ciudad"],
    ["postalCode", "Código postal"],
    ["phone", "Teléfono"],
    ["email", "Email"],
    ["website", "Web"],
    ["instagram", "Instagram"],
  ] as const;
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Información del negocio</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            {key === "displayName" || key === "email" ? (
              <RequiredLabel htmlFor={`manual-${key}`}>{label}</RequiredLabel>
            ) : (
              <Label htmlFor={`manual-${key}`}>{label}</Label>
            )}
            <Input
              id={`manual-${key}`}
              type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
              value={form[key]}
              onChange={(event) => set(key, event.target.value)}
              aria-invalid={Boolean(errors[key])}
              className={cn(errors[key] && "border-destructive ring-1 ring-destructive/20")}
            />
            <FieldError message={errors[key]} />
          </div>
        ))}
      </div>
      <div className="mt-8 border-t pt-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Building2 className="size-5" /> Establecimientos
            </h3>
            <p className="text-sm text-muted-foreground">
              Plan {plan.name}: {locations.length} de {plan.maxLocations}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={locations.length >= plan.maxLocations}
            onClick={() => setLocations((current) => [...current, emptyLocation()])}
          >
            <Plus className="size-4" /> Añadir
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {locations.map((location, index) => (
            <div key={index} className="rounded-2xl border p-4">
              <div className="mb-3 flex justify-between">
                <strong className="text-sm">Establecimiento {index + 1}</strong>
                {locations.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLocations((current) => current.filter((_, item) => item !== index))
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
                    {key === "name" ? (
                      <RequiredLabel>{label}</RequiredLabel>
                    ) : (
                      <Label>{label}</Label>
                    )}
                    <Input
                      value={location[key]}
                      aria-invalid={Boolean(locationErrors[index]?.[key])}
                      className={cn(
                        locationErrors[index]?.[key] &&
                          "border-destructive ring-1 ring-destructive/20",
                      )}
                      onChange={(event) => {
                        clearLocationError(index, key);
                        setLocations((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, [key]: event.target.value } : item,
                          ),
                        );
                      }}
                    />
                    <FieldError message={locationErrors[index]?.[key]} />
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
  image,
}: {
  form: Form;
  set: Setter;
  image: (file: File, key: "logo" | "cover") => void;
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
              <Label>{label}</Label>
              <Input
                type="color"
                value={form[key]}
                onChange={(event) => set(key, event.target.value)}
              />
            </div>
          ))}
          {(["logo", "cover"] as const).map((key) => (
            <div key={key} className="col-span-2 space-y-1.5">
              <Label>{key === "logo" ? "Logo" : "Imagen principal"}</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => event.target.files?.[0] && image(event.target.files[0], key)}
              />
              <p className="text-xs text-muted-foreground">
                <Upload className="mr-1 inline size-3" /> PNG, JPG o WebP · máximo 3 MB
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
            <img src={form.logo} alt="Logo" className="mb-8 h-12 max-w-40 object-contain" />
          ) : null}
          <p className="text-sm opacity-70">Vista previa</p>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            {form.displayName || "Tu negocio"}
          </h3>
        </div>
      </div>
    </div>
  );
}

function ProgramStep({ form, set, errors }: { form: Form; set: Setter; errors: FieldErrors }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Programa de fidelización</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <RequiredLabel>Nombre público</RequiredLabel>
          <Input
            value={form.programName}
            onChange={(event) => set("programName", event.target.value)}
            aria-invalid={Boolean(errors.programName)}
            className={cn(errors.programName && "border-destructive ring-1 ring-destructive/20")}
          />
          <FieldError message={errors.programName} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descripción</Label>
          <Textarea
            value={form.programDescription}
            onChange={(event) => set("programDescription", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mecánica</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={form.mechanic}
            onChange={(event) => set("mechanic", event.target.value)}
          >
            <option value="points">Puntos (acumulación por gasto)</option>
            <option value="stamps">Sellos</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Condiciones</Label>
          <Textarea value={form.terms} onChange={(event) => set("terms", event.target.value)} />
        </div>
      </div>
    </div>
  );
}

function WalletStep({ form, set }: { form: Form; set: Setter }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Tarjeta digital</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Define el mensaje principal de la tarjeta Wallet.
      </p>
      <div className="mt-5 max-w-xl space-y-1.5">
        <Label>Titular</Label>
        <Input
          value={form.walletHeadline}
          onChange={(event) => set("walletHeadline", event.target.value)}
        />
      </div>
      <div
        className="mt-6 max-w-sm rounded-2xl p-6"
        style={{ backgroundColor: form.primary, color: form.background }}
      >
        <p className="text-xs opacity-70">{form.programName || "Tu programa"}</p>
        <p className="mt-8 font-display text-xl font-semibold">{form.walletHeadline}</p>
      </div>
    </div>
  );
}

function UserStep({
  form,
  set,
  plan,
  locations,
  errors,
}: {
  form: Form;
  set: Setter;
  plan: (typeof subscriptionPlans)[number];
  locations: number;
  errors: FieldErrors;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-semibold">Crear usuario administrador</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Último paso exclusivo del onboarding manual.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <RequiredLabel>Nombre</RequiredLabel>
          <Input
            value={form.ownerName}
            onChange={(event) => set("ownerName", event.target.value)}
            aria-invalid={Boolean(errors.ownerName)}
            className={cn(errors.ownerName && "border-destructive ring-1 ring-destructive/20")}
          />
          <FieldError message={errors.ownerName} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <RequiredLabel>Email de acceso</RequiredLabel>
          <Input
            type="email"
            value={form.ownerEmail}
            onChange={(event) => set("ownerEmail", event.target.value)}
            aria-invalid={Boolean(errors.ownerEmail)}
            className={cn(errors.ownerEmail && "border-destructive ring-1 ring-destructive/20")}
          />
          <FieldError message={errors.ownerEmail} />
          <p className="text-xs text-muted-foreground">
            Debe ser un email que todavía no tenga una cuenta en Fideleo.
          </p>
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Contraseña</RequiredLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => set("password", event.target.value)}
            aria-invalid={Boolean(errors.password)}
            className={cn(errors.password && "border-destructive ring-1 ring-destructive/20")}
          />
          <FieldError message={errors.password} />
        </div>
        <div className="space-y-1.5">
          <RequiredLabel>Repetir contraseña</RequiredLabel>
          <Input
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirmation}
            onChange={(event) => set("passwordConfirmation", event.target.value)}
            aria-invalid={Boolean(errors.passwordConfirmation)}
            className={cn(
              errors.passwordConfirmation && "border-destructive ring-1 ring-destructive/20",
            )}
          />
          <FieldError message={errors.passwordConfirmation} />
        </div>
      </div>
      <div className="mt-6 rounded-xl bg-muted p-4 text-sm">
        <strong>{form.displayName}</strong>
        <p className="mt-1 text-muted-foreground">
          Plan {plan.name} · {locations} establecimiento{locations === 1 ? "" : "s"} · Club listo
          para publicar
        </p>
      </div>
    </div>
  );
}
