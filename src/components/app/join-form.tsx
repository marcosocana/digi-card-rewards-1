import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ruleText } from "@/lib/format";

export interface JoinContext {
  organization: { display_name: string; slug?: string };
  program: {
    id: string;
    public_name: string;
    description: string | null;
    earning_mode: string;
    earning_value: number;
    terms: string | null;
  };
  location: { id: string; name: string } | null;
  primaryColor?: string;
}

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  birth_date: "",
};

export function JoinForm({ ctx }: { ctx: JoinContext }) {
  const [form, setForm] = useState(emptyForm);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [code, setCode] = useState("");
  const [publicId, setPublicId] = useState<string | null>(null);

  const sendVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!terms) return toast.error("Debes aceptar las condiciones y la política de privacidad");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: form.email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error)
      return toast.error("No hemos podido enviar el email", { description: error.message });
    setVerificationSent(true);
    toast.success("Revisa tu email", {
      description: "Te hemos enviado un código de verificación.",
    });
  };

  const verifyAndRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.trim().length < 6) return toast.error("Introduce el código recibido por email");
    setLoading(true);
    const email = form.email.trim().toLowerCase();
    const { error: verificationError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (verificationError) {
      setLoading(false);
      return toast.error("El código no es válido o ha caducado", {
        description: verificationError.message,
      });
    }
    const [firstName, ...lastName] = form.full_name.trim().split(/\s+/);
    const { data, error } = await supabase.rpc("register_verified_customer_and_membership", {
      _program_id: ctx.program.id,
      _email: email,
      _first_name: firstName,
      _last_name: lastName.join(" ") || undefined,
      _birth_date: form.birth_date || undefined,
      _location_id: ctx.location?.id ?? undefined,
      _marketing: marketing,
      _phone: form.phone.trim() || undefined,
      _terms_accepted: terms,
    });
    setLoading(false);
    if (error)
      return toast.error("No hemos podido completar el alta", { description: error.message });
    setPublicId((data as { membership_public_id: string }).membership_public_id);
  };

  if (publicId) {
    return (
      <div className="rounded-[1.75rem] bg-white p-7 text-center text-[#111] shadow-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold">¡Ya formas parte del club!</h2>
        <p className="mt-2 text-sm text-black/55">
          Tu email ha sido verificado. Guarda ahora tu tarjeta para consultar puntos y recompensas.
        </p>
        <Button
          asChild
          className="mt-6 w-full rounded-full"
          size="lg"
          style={{ backgroundColor: ctx.primaryColor }}
        >
          <a href={`/mi-tarjeta/${publicId}`}>
            Ver mi tarjeta <ArrowRight />
          </a>
        </Button>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <form
        onSubmit={verifyAndRegister}
        className="rounded-[1.75rem] bg-white p-6 text-[#111] shadow-xl sm:p-8"
      >
        <span className="grid size-12 place-items-center rounded-full bg-black text-white">
          <MailCheck className="size-5" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold">Verifica tu email</h2>
        <p className="mt-2 text-sm leading-relaxed text-black/55">
          Hemos enviado un código a <strong className="text-black">{form.email}</strong>.
          Introdúcelo para crear tu tarjeta.
        </p>
        <div className="mt-6 space-y-2">
          <Label htmlFor="verification-code">Código de verificación</Label>
          <Input
            id="verification-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))}
            className="h-12 text-center text-xl tracking-[.35em]"
            placeholder="000000"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="mt-5 w-full rounded-full"
          disabled={loading}
          style={{ backgroundColor: ctx.primaryColor }}
        >
          {loading ? "Verificando…" : "Verificar y crear mi tarjeta"}
        </Button>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm underline underline-offset-4"
          onClick={() => setVerificationSent(false)}
        >
          Cambiar email
        </button>
      </form>
    );
  }

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const legalLink = (document: string, label: string) =>
    ctx.organization.slug ? (
      <Link
        to="/club/$businessSlug/legal/$document"
        params={{ businessSlug: ctx.organization.slug, document }}
        target="_blank"
        className="font-semibold underline"
      >
        {label}
      </Link>
    ) : (
      label
    );

  return (
    <form
      onSubmit={sendVerification}
      className="rounded-[1.75rem] bg-white p-6 text-[#111] shadow-xl sm:p-8"
    >
      <div>
        <p
          className="text-xs font-bold uppercase tracking-[.16em]"
          style={{ color: ctx.primaryColor }}
        >
          Registro
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold">Crea tu tarjeta digital</h2>
        <p className="mt-2 text-sm text-black/50">
          La verificación se realizará siempre por email.
        </p>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="full-name">Nombre completo *</Label>
          <Input
            id="full-name"
            required
            autoComplete="name"
            value={form.full_name}
            onChange={(event) => update("full_name", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="join-email">Email *</Label>
          <Input
            id="join-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="join-phone">Teléfono *</Label>
          <Input
            id="join-phone"
            type="tel"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="birth-date">Fecha de nacimiento</Label>
          <Input
            id="birth-date"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={form.birth_date}
            onChange={(event) => update("birth_date", event.target.value)}
          />
        </div>
      </div>
      <div className="mt-6 space-y-4 border-t pt-5">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            required
            checked={terms}
            onCheckedChange={(value) => setTerms(value === true)}
          />
          <span>
            Acepto las {legalLink("terminos", "condiciones del programa")} y la{" "}
            {legalLink("privacidad", "política de privacidad")}.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-black/55">
          <Checkbox checked={marketing} onCheckedChange={(value) => setMarketing(value === true)} />
          <span>
            Quiero recibir novedades y promociones de {ctx.organization.display_name}. Este
            consentimiento es opcional.
          </span>
        </label>
      </div>
      <p className="mt-5 text-xs text-black/45">
        {ruleText(ctx.program.earning_mode, ctx.program.earning_value)}
      </p>
      <Button
        type="submit"
        size="lg"
        className="mt-5 w-full rounded-full"
        disabled={loading || !terms}
        style={{ backgroundColor: ctx.primaryColor }}
      >
        {loading ? "Enviando código…" : "Continuar"} <ArrowRight />
      </Button>
    </form>
  );
}
