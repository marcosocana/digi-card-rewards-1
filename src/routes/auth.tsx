import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    confirmed: search.confirmed === "1",
    reset: search.reset === "1",
    tab: search.tab === "signup" ? ("signup" as const) : ("signin" as const),
    email: typeof search.email === "string" ? search.email.slice(0, 254) : "",
  }),
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Fideleo" },
      { name: "description", content: "Accede al backoffice de fidelización de Fideleo." },
      { property: "og:title", content: "Iniciar sesión — Fideleo" },
      { property: "og:description", content: "Acceso para comercios y personal de caja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const demoUsers = [
  {
    email: "super@cafenorte.es",
    password: "super@cafenorte.es",
    role: "Superadministrador",
  },
  {
    email: "admin@cafenorte.es",
    password: "admin@cafenorte.es",
    role: "Administrador de Café Norte",
  },
  {
    email: "malasana@cafenorte.es",
    password: "malasana@cafenorte.es",
    role: "Responsable de Malasaña",
  },
  {
    email: "empleado@cafenorte.es",
    password: "empleado@cafenorte.es",
    role: "Empleado de Malasaña",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const welcomeHandled = useRef(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(search.tab);
  const [email, setEmail] = useState(search.email);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [signupSent, setSignupSent] = useState(false);
  const [signupWasRepeated, setSignupWasRepeated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.confirmed || welcomeHandled.current) return;
    let cancelled = false;

    const finishConfirmation = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled || welcomeHandled.current) return;
      welcomeHandled.current = true;
      try {
        await sendTransactionalEmail({ kind: "account_welcome" });
      } catch (emailError) {
        console.error("No se pudo enviar el email de bienvenida", emailError);
      }
      toast.success("Email verificado", { description: "Tu cuenta de Fideleo ya está activa." });
      window.location.assign("/panel");
    };

    void finishConfirmation();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void finishConfirmation();
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [search.confirmed]);

  const signInWithCredentials = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido iniciar sesión", { description: error.message });
      return;
    }
    window.location.assign("/panel");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithCredentials(email, password);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1`,
        data: { full_name: fullName.trim(), business_name: businessName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido crear la cuenta", { description: error.message });
      return;
    }
    if (!data.session) {
      const repeatedSignup = data.user?.identities?.length === 0;
      if (repeatedSignup) {
        setLoading(true);
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: `${window.location.origin}/auth?confirmed=1` },
        });
        setLoading(false);
        if (resendError) {
          toast.error("No hemos podido reenviar el email", {
            description: resendError.message,
          });
          return;
        }
      }
      setSignupWasRepeated(repeatedSignup);
      setSignupSent(true);
      toast.success(
        repeatedSignup
          ? "Si la cuenta estaba pendiente, recibirá un nuevo enlace"
          : "Revisa tu correo para confirmar la cuenta",
      );
      return;
    }
    try {
      await sendTransactionalEmail({ kind: "account_welcome" });
    } catch (emailError) {
      console.error("No se pudo enviar el email de bienvenida", emailError);
    }
    void navigate({ to: "/panel" });
  };

  const resendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) return toast.error("Introduce un email válido");
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth?confirmed=1` },
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido reenviar el email", { description: error.message });
      return;
    }
    toast.success("Email de verificación reenviado");
  };

  const requestPasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) return toast.error("Introduce primero tu email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth?reset=1`,
    });
    setLoading(false);
    if (error)
      return toast.error("No hemos podido enviar el email", { description: error.message });
    toast.success("Revisa tu correo", {
      description: "Te hemos enviado un enlace para crear una nueva contraseña.",
    });
  };

  const completePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8)
      return toast.error("La contraseña debe tener al menos 8 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      try {
        await sendTransactionalEmail({ kind: "password_changed", eventId: crypto.randomUUID() });
      } catch (emailError) {
        console.error("No se pudo enviar el aviso de cambio de contraseña", emailError);
      }
    }
    setLoading(false);
    if (error)
      return toast.error("No hemos podido cambiar la contraseña", {
        description: error.message,
      });
    toast.success("Contraseña actualizada");
    window.location.assign("/panel");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-xl font-semibold">
          Fideleo
        </Link>
        <div className="surface mt-4 p-6">
          {search.reset ? (
            <form onSubmit={completePasswordReset} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold">Crea una nueva contraseña</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usa al menos 8 caracteres para proteger tu cuenta.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Actualizando…" : "Guardar nueva contraseña"}
              </Button>
            </form>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={signIn} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Entrando…" : "Entrar"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                    disabled={loading}
                    onClick={() => void requestPasswordReset()}
                  >
                    ¿Has olvidado tu contraseña?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {signupSent ? (
                  <div className="mt-5 rounded-2xl border bg-[#dff7ff] p-5 text-center">
                    <h2 className="font-display text-xl font-bold">
                      {signupWasRepeated ? "Este email ya está registrado" : "Revisa tu email"}
                    </h2>
                    <p className="mt-2 text-sm text-black/65">
                      {signupWasRepeated ? (
                        <>
                          Si la cuenta de <strong>{email}</strong> todavía estaba pendiente, hemos
                          solicitado un nuevo enlace de verificación. Si ya estaba verificada,
                          inicia sesión con tu contraseña.
                        </>
                      ) : (
                        <>
                          Te hemos enviado un enlace a <strong>{email}</strong> para verificar tu
                          email y terminar de crear tu cuenta.
                        </>
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="default"
                        disabled={loading}
                        onClick={() => void resendConfirmation()}
                      >
                        {loading ? "Enviando…" : "Reenviar email"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => setSignupSent(false)}
                      >
                        Cambiar email
                      </Button>
                      {signupWasRepeated ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={() => {
                            setSignupSent(false);
                            setActiveTab("signin");
                          }}
                        >
                          Iniciar sesión
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={signUp} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="business-name">Nombre del negocio</Label>
                      <Input
                        id="business-name"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email2">Email</Label>
                      <Input
                        id="email2"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password2">Contraseña</Label>
                      <Input
                        id="password2"
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Usa el email al que te invitaron para heredar tu rol automáticamente.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creando…" : "Crear cuenta"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="surface mt-4 p-5">
          <h2 className="text-sm font-semibold">Cuentas demo preparadas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pulsa una cuenta para entrar directamente. La contraseña es el mismo email.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs">
            {demoUsers.map((u) => (
              <li key={u.email} className="flex justify-between gap-3">
                <button
                  type="button"
                  disabled={loading}
                  className="font-medium underline-offset-2 hover:underline"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    void signInWithCredentials(u.email, u.password);
                  }}
                >
                  {u.email}
                </button>
                <span className="text-muted-foreground">{u.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
