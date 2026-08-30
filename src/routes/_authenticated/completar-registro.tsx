import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export const Route = createFileRoute("/_authenticated/completar-registro")({
  validateSearch: (search: Record<string, unknown>) => ({
    next:
      typeof search.next === "string" && search.next.startsWith("/panel")
        ? search.next.slice(0, 500)
        : "/panel",
  }),
  head: () => ({
    meta: [
      { title: "Completa tu registro — Fideleo" },
      {
        name: "description",
        content: "Confirma los datos básicos de tu negocio para terminar de crear tu cuenta.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CompleteRegistrationPage,
});

type AccountContext = {
  userId: string;
  email: string;
};

function CompleteRegistrationPage() {
  const { next } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [context, setContext] = useState<AccountContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) {
        window.location.replace(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      const user = userResult.user;
      const existingBusinessName =
        typeof user.user_metadata.business_name === "string"
          ? user.user_metadata.business_name.trim()
          : "";
      if (existingBusinessName) {
        window.location.replace(next);
        return;
      }

      if (cancelled) return;
      setFullName(
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === "string"
            ? user.user_metadata.name
            : "",
      );
      setBusinessName("");
      setContext({
        userId: user.id,
        email: user.email ?? "",
      });
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [next]);

  const completeRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = fullName.trim();
    const normalizedBusiness = businessName.trim();
    if (normalizedName.length < 2 || normalizedBusiness.length < 2 || !context) return;

    setSaving(true);
    const { error: ensureError } = await supabase.rpc("ensure_current_business_account", {
      _business_name: normalizedBusiness,
    });
    if (ensureError) {
      setSaving(false);
      toast.error("No hemos podido preparar tu negocio", { description: ensureError.message });
      return;
    }
    const { data: membership, error: membershipError } = await supabase
      .from("organization_users")
      .select("id,organization_id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .eq("role", "admin")
      .limit(1)
      .single();
    if (membershipError) {
      setSaving(false);
      toast.error("No hemos podido cargar el negocio", { description: membershipError.message });
      return;
    }
    const [profileResult, memberResult, organizationResult] = await Promise.all([
      supabase.from("profiles").update({ full_name: normalizedName }).eq("id", context.userId),
      supabase
        .from("organization_users")
        .update({ full_name: normalizedName })
        .eq("id", membership.id),
      supabase
        .from("organizations")
        .update({ display_name: normalizedBusiness, contact_email: context.email })
        .eq("id", membership.organization_id),
    ]);
    const databaseError = profileResult.error ?? memberResult.error ?? organizationResult.error;
    if (databaseError) {
      setSaving(false);
      toast.error("No hemos podido guardar tus datos", { description: databaseError.message });
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { full_name: normalizedName, business_name: normalizedBusiness },
    });
    if (metadataError) {
      setSaving(false);
      toast.error("No hemos podido completar el registro", { description: metadataError.message });
      return;
    }

    try {
      await sendTransactionalEmail({ kind: "account_welcome" });
    } catch (emailError) {
      console.error("No se pudo enviar el email de bienvenida", emailError);
    }
    toast.success("Cuenta creada", { description: "Ahora puedes configurar tu negocio." });
    window.location.assign(next);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f3ff] px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2">
          <img src="/isotipo.svg" alt="" className="size-7" />
          <span className="font-display text-xl font-semibold">Fideleo</span>
        </Link>
        <section className="surface mt-5 p-6 sm:p-8">
          <p className="text-sm font-semibold text-primary">Un último paso</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Completa tu registro
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Google ya ha verificado tu email. Confirma estos datos para crear correctamente el
            espacio de tu negocio.
          </p>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center" aria-label="Cargando cuenta">
              <LoaderCircle className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={completeRegistration} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="oauth-full-name">Nombre completo</Label>
                <Input
                  id="oauth-full-name"
                  required
                  minLength={2}
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oauth-business-name">Nombre del negocio</Label>
                <Input
                  id="oauth-business-name"
                  required
                  minLength={2}
                  autoComplete="organization"
                  autoFocus
                  placeholder="Por ejemplo, Bar Casa Andrea"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving || !context}>
                {saving ? <LoaderCircle className="animate-spin" /> : null}
                {saving ? "Guardando…" : "Completar registro"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
