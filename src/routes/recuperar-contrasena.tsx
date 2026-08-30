import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-contrasena")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — Fideleo" },
      {
        name: "description",
        content: "Solicita un enlace seguro para recuperar tu contraseña de Fideleo.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecuperarContrasenaPage,
});

function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error("Introduce un email válido");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth?reset=1`,
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido enviar el email", { description: error.message });
      return;
    }
    setSent(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-xl font-semibold">
          Fideleo
        </Link>
        <section className="surface mt-4 p-6">
          {sent ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
              <div>
                <h1 className="font-display text-2xl font-bold">Revisa tu correo</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Si existe una cuenta asociada a <strong>{email.trim()}</strong>, recibirás un
                  enlace para crear una nueva contraseña.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSent(false)}
              >
                Enviar a otro email
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth" search={{ tab: "signin" }}>
                  <ArrowLeft className="size-4" aria-hidden /> Volver a iniciar sesión
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold">Recupera tu contraseña</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Introduce el email de tu cuenta y te enviaremos un enlace seguro para cambiarla.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recovery-email">Email</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="recovery-email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    className="pl-9"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? "Enviando…" : "Enviar enlace de recuperación"}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth" search={{ tab: "signin" }}>
                  <ArrowLeft className="size-4" aria-hidden /> Volver a iniciar sesión
                </Link>
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
