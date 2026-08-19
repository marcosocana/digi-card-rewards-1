import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ruleText } from "@/lib/format";

export interface JoinContext {
  organization: { display_name: string };
  program: {
    id: string;
    public_name: string;
    description: string | null;
    earning_mode: string;
    earning_value: number;
    terms: string | null;
  };
  location: { id: string; name: string } | null;
}

export function JoinForm({ ctx }: { ctx: JoinContext }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicId, setPublicId] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("register_customer_and_membership", {
      _program_id: ctx.program.id,
      _email: form.email.trim().toLowerCase(),
      _first_name: form.first_name.trim(),
      _last_name: form.last_name.trim() || null,
      _location_id: ctx.location?.id ?? null,
      _marketing: marketing,
      _phone: form.phone.trim() || null,
      _terms_accepted: terms,
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido completar el alta", { description: error.message });
      return;
    }
    setPublicId((data as { membership_public_id: string }).membership_public_id);
  };

  if (publicId) {
    return (
      <div className="surface p-6 text-center">
        <h2 className="font-display text-2xl font-semibold">¡Ya eres miembro!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Guarda tu tarjeta para consultar puntos y recompensas en cualquier momento.
        </p>
        <Button asChild className="mt-5 w-full" size="lg">
          <a href={`/mi-tarjeta/${publicId}`}>Ver mi tarjeta</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface space-y-4 p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fn">Nombre</Label>
          <Input
            id="fn"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ln">Apellidos</Label>
          <Input
            id="ln"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="em">Email</Label>
        <Input
          id="em"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          required
          inputMode="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox required checked={terms} onCheckedChange={(v) => setTerms(v === true)} />
        <span>Acepto las condiciones del programa y la política de privacidad.</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} />
        Quiero recibir novedades y promociones de {ctx.organization.display_name}.
      </label>
      <p className="text-xs text-muted-foreground">
        {ruleText(ctx.program.earning_mode, ctx.program.earning_value)}
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={loading || !terms}>
        {loading ? "Creando tu tarjeta…" : "Unirme al programa"}
      </Button>
    </form>
  );
}
