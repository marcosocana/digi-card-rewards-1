import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { BrandLoader } from "@/components/app/brand-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/aceptar-invitacion")({
  head: () => ({
    meta: [
      { title: "Completa tu acceso — Fideleo" },
      {
        name: "description",
        content: "Establece tu contraseña para acceder al equipo de Fideleo.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitationOnboardingPage,
});

function InvitationOnboardingPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    };
    void refreshSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void refreshSession());
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const completeInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      toast.error("No hemos podido crear tu contraseña", { description: error.message });
      return;
    }

    const { error: accountError } = await supabase.rpc("ensure_current_business_account", {});
    if (accountError) {
      setLoading(false);
      toast.error("No hemos podido preparar tu acceso", { description: accountError.message });
      return;
    }

    try {
      await sendTransactionalEmail({ kind: "account_welcome" });
    } catch (emailError) {
      console.error("No se pudo enviar la confirmación de cuenta", emailError);
    }
    setLoading(false);
    setCompleted(true);
  };

  if (checkingSession) return <BrandLoader />;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fff8fc] px-5 py-12 text-[#111]">
      <div className="absolute -left-24 top-16 size-72 rounded-full bg-[#dff7ff] blur-2xl" />
      <div className="absolute -right-20 bottom-10 size-80 rounded-full bg-[#f8b9e7]/65 blur-2xl" />
      <section className="relative w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-7 shadow-[0_24px_80px_-35px_rgba(0,0,0,.28)] sm:p-9">
        <Link to="/" aria-label="Fideleo, volver al inicio" className="inline-flex">
          <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-8 w-auto" />
        </Link>

        {completed ? (
          <div className="mt-10">
            <span className="grid size-12 place-items-center rounded-full bg-[#dff7ff]">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
              Tu usuario ya está creado
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-black/60">
              La contraseña se ha guardado y ya tienes acceso a la plataforma. También te hemos
              enviado un email de confirmación.
            </p>
            <Button className="mt-7 w-full rounded-full" asChild>
              <a href="/panel">Entrar en Fideleo</a>
            </Button>
          </div>
        ) : hasSession ? (
          <form className="mt-10 space-y-5" onSubmit={completeInvitation}>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">
                Invitación
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                Crea tu contraseña
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-black/60">
                Elige una contraseña para terminar de crear tu usuario y acceder a la plataforma.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitation-password">Contraseña</Label>
              <Input
                id="invitation-password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitation-password-confirmation">Repetir contraseña</Label>
              <Input
                id="invitation-password-confirmation"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? "Creando usuario…" : "Crear usuario y acceder"}
            </Button>
          </form>
        ) : (
          <div className="mt-10">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              La invitación no está disponible
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-black/60">
              El enlace puede haber caducado o ya se ha utilizado. Solicita una nueva invitación al
              administrador de tu empresa.
            </p>
            <Button variant="outline" className="mt-7 w-full rounded-full" asChild>
              <Link to="/auth">Ir a iniciar sesión</Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
