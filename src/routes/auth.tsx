import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    confirmed: search.confirmed === "1",
    reset: search.reset === "1",
    oauth: search.oauth === "1",
    tab: search.tab === "signup" ? ("signup" as const) : ("signin" as const),
    email: typeof search.email === "string" ? search.email.slice(0, 254) : "",
    next:
      typeof search.next === "string" && search.next.startsWith("/panel")
        ? search.next.slice(0, 500)
        : "/panel",
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
    plan: "Todas las empresas",
    email: "dios@demo.fideleo.app",
    password: "dios@demo.fideleo.app",
    role: "Modo dios · Superadmin",
    onboarding: false,
  },
  {
    plan: "Gratis",
    email: "admin.gratis@demo.fideleo.app",
    password: "admin.gratis@demo.fideleo.app",
    role: "Administrador",
    onboarding: true,
  },
  {
    plan: "Gratis",
    email: "manager.gratis@demo.fideleo.app",
    password: "manager.gratis@demo.fideleo.app",
    role: "Responsable",
    onboarding: false,
  },
  {
    plan: "Gratis",
    email: "staff.gratis@demo.fideleo.app",
    password: "staff.gratis@demo.fideleo.app",
    role: "Empleado",
    onboarding: false,
  },
  ...(["Básico", "Pro", "Ultra"] as const).flatMap((plan) => {
    const code = plan === "Básico" ? "basico" : plan.toLowerCase();
    return [
      {
        plan,
        email: `admin.${code}@demo.fideleo.app`,
        password: `admin.${code}@demo.fideleo.app`,
        role: "Administrador",
        onboarding: true,
      },
      {
        plan,
        email: `manager.${code}@demo.fideleo.app`,
        password: `manager.${code}@demo.fideleo.app`,
        role: "Responsable",
        onboarding: false,
      },
      {
        plan,
        email: `staff.${code}@demo.fideleo.app`,
        password: `staff.${code}@demo.fideleo.app`,
        role: "Empleado",
        onboarding: false,
      },
    ];
  }),
];

const ensureBusinessAccount = async (name?: string) => {
  const { error } = await supabase.rpc("ensure_current_business_account", {
    _business_name: name?.trim() || undefined,
  });
  if (error) throw error;
};

const needsGoogleRegistrationDetails = async (user: User) => {
  const providers = Array.isArray(user.app_metadata.providers)
    ? (user.app_metadata.providers as string[])
    : [];
  const usesGoogle = user.app_metadata.provider === "google" || providers.includes("google");
  const businessName =
    typeof user.user_metadata.business_name === "string"
      ? user.user_metadata.business_name.trim()
      : "";
  if (!usesGoogle || businessName) return false;

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_users")
      .select("role, organizations(slug, status, onboarding_completed_at)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (membershipResult.error) throw membershipResult.error;
  if (profileResult.data?.platform_role === "superadmin") return false;

  const membership = membershipResult.data;
  if (!membership) return true;
  const organization = membership?.organizations as {
    slug: string;
    status: string;
    onboarding_completed_at: string | null;
  } | null;
  const personalSuffix = user.id.replaceAll("-", "").slice(0, 8);

  return Boolean(
    membership?.role === "admin" &&
    organization?.slug.endsWith(`-${personalSuffix}`) &&
    organization.status === "configuration_pending" &&
    !organization.onboarding_completed_at,
  );
};

function AuthPage() {
  const search = Route.useSearch();
  const destination = search.next;
  const welcomeHandled = useRef(false);
  const demoHandled = useRef(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(search.tab);
  const [email, setEmail] = useState(search.email);
  const [password, setPassword] = useState(
    search.email === "admin.pro@demo.fideleo.app" ? "admin.pro@demo.fideleo.app" : "",
  );
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [signupSent, setSignupSent] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"signin" | "signup" | null>(null);

  useEffect(() => {
    if (!search.oauth) return;
    let cancelled = false;

    const finishOAuth = async (receivedSession?: Session | null) => {
      let sessionResult =
        receivedSession === undefined
          ? await supabase.auth.getSession()
          : { data: { session: receivedSession }, error: null };
      if (!sessionResult.data.session && typeof window !== "undefined") {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          sessionResult = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        }
      }
      const { data, error } = sessionResult;
      if (cancelled) return;
      if (error) {
        toast.error("No hemos podido completar el acceso con Google", {
          description: error.message,
        });
        return;
      }
      if (!data.session) return;
      if (welcomeHandled.current) return;
      welcomeHandled.current = true;

      const intent = window.localStorage.getItem("fideleo:google-oauth-intent");
      window.localStorage.removeItem("fideleo:google-oauth-intent");
      window.localStorage.removeItem("fideleo:google-oauth-next");
      try {
        await ensureBusinessAccount();
        if (await needsGoogleRegistrationDetails(data.session.user)) {
          window.location.assign(`/completar-registro?next=${encodeURIComponent(destination)}`);
          return;
        }
      } catch (accountError) {
        welcomeHandled.current = false;
        toast.error("No hemos podido preparar tu cuenta", {
          description: accountError instanceof Error ? accountError.message : "Inténtalo de nuevo",
        });
        return;
      }
      if (intent === "signup") {
        try {
          await sendTransactionalEmail({ kind: "account_welcome" });
        } catch (emailError) {
          console.error("No se pudo enviar el email de bienvenida", emailError);
        }
      }
      window.location.assign(destination);
    };

    void finishOAuth();
    const timeout = window.setTimeout(() => {
      if (cancelled || welcomeHandled.current) return;
      setOauthLoading(null);
      toast.error("No hemos podido completar el acceso con Google", {
        description: "No se ha recibido una sesión válida. Vuelve a intentarlo.",
      });
    }, 12_000);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      window.setTimeout(() => {
        if (!cancelled) void finishOAuth(authSession);
      }, 0);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [destination, search.oauth]);

  useEffect(() => {
    if (!search.confirmed || welcomeHandled.current) return;
    let cancelled = false;

    const finishConfirmation = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled || welcomeHandled.current) return;
      welcomeHandled.current = true;
      try {
        await ensureBusinessAccount(businessName);
      } catch (accountError) {
        welcomeHandled.current = false;
        toast.error("No hemos podido preparar tu cuenta", {
          description: accountError instanceof Error ? accountError.message : "Inténtalo de nuevo",
        });
        return;
      }
      try {
        await sendTransactionalEmail({ kind: "account_welcome" });
      } catch (emailError) {
        console.error("No se pudo enviar el email de bienvenida", emailError);
      }
      toast.success("Email verificado", { description: "Tu cuenta de Fideleo ya está activa." });
      window.location.assign(destination);
    };

    void finishConfirmation();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void finishConfirmation();
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [businessName, destination, search.confirmed]);

  const signInWithCredentials = useCallback(
    async (loginEmail: string, loginPassword: string, nextDestination = destination) => {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) {
        setLoading(false);
        toast.error("No hemos podido iniciar sesión", { description: error.message });
        return;
      }
      try {
        await ensureBusinessAccount();
      } catch (accountError) {
        setLoading(false);
        toast.error("No hemos podido preparar tu cuenta", {
          description: accountError instanceof Error ? accountError.message : "Inténtalo de nuevo",
        });
        return;
      }
      setLoading(false);
      window.location.assign(nextDestination);
    },
    [destination],
  );

  useEffect(() => {
    if (search.email !== "admin.pro@demo.fideleo.app" || demoHandled.current) return;
    demoHandled.current = true;
    void signInWithCredentials("admin.pro@demo.fideleo.app", "admin.pro@demo.fideleo.app");
  }, [search.email, signInWithCredentials]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithCredentials(email, password);
  };

  const continueWithGoogle = async (intent: "signin" | "signup") => {
    setOauthLoading(intent);
    window.localStorage.setItem("fideleo:google-oauth-intent", intent);
    window.localStorage.setItem("fideleo:google-oauth-next", destination);
    const callbackUrl = new URL("/auth", window.location.origin);
    callbackUrl.searchParams.set("oauth", "1");
    callbackUrl.searchParams.set("next", destination);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: { prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      window.localStorage.removeItem("fideleo:google-oauth-intent");
      window.localStorage.removeItem("fideleo:google-oauth-next");
      setOauthLoading(null);
      const providerDisabled = /provider.*not enabled|unsupported provider/i.test(error.message);
      toast.error("No hemos podido conectar con Google", {
        description: providerDisabled
          ? "Google todavía no está habilitado en la configuración de autenticación."
          : error.message,
      });
      return;
    }
    if (!data.url) {
      window.localStorage.removeItem("fideleo:google-oauth-intent");
      window.localStorage.removeItem("fideleo:google-oauth-next");
      setOauthLoading(null);
      toast.error("No hemos podido conectar con Google", {
        description: "El proveedor no ha devuelto una dirección de acceso válida.",
      });
      return;
    }
    window.location.assign(data.url);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("register-business-account", {
      body: {
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        redirectTo: `${window.location.origin}/auth?confirmed=1&next=${encodeURIComponent(destination)}`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido crear la cuenta", { description: error.message });
      return;
    }
    if (data?.code === "account_exists") {
      setAccountExists(true);
      return;
    }
    if (!data?.ok) {
      toast.error("No hemos podido crear la cuenta", {
        description: data?.error || "Inténtalo de nuevo dentro de unos minutos.",
      });
      return;
    }
    setAccountExists(false);
    setSignupSent(true);
    toast.success("Revisa tu correo para confirmar la cuenta");
  };

  const resendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) return toast.error("Introduce un email válido");
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?confirmed=1&next=${encodeURIComponent(destination)}`,
      },
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
      <div className="w-full max-w-6xl">
        <Link to="/" className="font-display text-xl font-semibold">
          Fideleo
        </Link>
        <div className="surface mx-auto mt-4 max-w-md p-6">
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
                <div className="mt-5">
                  <GoogleAuthButton
                    label="Continuar con Google"
                    loading={oauthLoading === "signin"}
                    disabled={loading || oauthLoading !== null}
                    onClick={() => void continueWithGoogle("signin")}
                  />
                  <AuthDivider />
                </div>
                <form onSubmit={signIn} className="space-y-4">
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
                  <Link
                    to="/recuperar-contrasena"
                    className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    ¿Has olvidado tu contraseña?
                  </Link>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {accountExists ? (
                  <div className="mt-5 rounded-2xl border bg-[#fff0d8] p-5 text-center">
                    <h2 className="font-display text-xl font-bold">Esta cuenta ya existe</h2>
                    <p className="mt-2 text-sm text-black/65">
                      Ya hay una cuenta asociada a <strong>{email}</strong>. Inicia sesión o
                      recupera la contraseña si no la recuerdas.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        disabled={loading}
                        onClick={() => void requestPasswordReset()}
                      >
                        {loading ? "Enviando…" : "Recuperar contraseña"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={() => {
                          setAccountExists(false);
                          setActiveTab("signin");
                        }}
                      >
                        Iniciar sesión
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={loading}
                        onClick={() => {
                          setAccountExists(false);
                          setEmail("");
                        }}
                      >
                        Usar otro email
                      </Button>
                    </div>
                  </div>
                ) : signupSent ? (
                  <div className="mt-5 rounded-2xl border bg-[#dff7ff] p-5 text-center">
                    <h2 className="font-display text-xl font-bold">Revisa tu email</h2>
                    <p className="mt-2 text-sm text-black/65">
                      Te hemos enviado un enlace a <strong>{email}</strong> para verificar tu email
                      y terminar de crear tu cuenta.
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
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <GoogleAuthButton
                      label="Crear cuenta con Google"
                      loading={oauthLoading === "signup"}
                      disabled={loading || oauthLoading !== null}
                      onClick={() => void continueWithGoogle("signup")}
                    />
                    <AuthDivider />
                    <form onSubmit={signUp} className="space-y-4">
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
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="surface mt-6 overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="font-display text-lg font-bold">Cuentas demo preparadas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Usa “Entrar” para abrir el panel con cada nivel de permisos. Las cuentas Gratis
              muestran todas las funciones bloqueadas.
            </p>
          </div>
          <Table className="min-w-[940px]">
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Contraseña</TableHead>
                <TableHead className="text-right">Accesos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoUsers.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-semibold">{user.plan}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="font-mono text-xs">{user.email}</TableCell>
                  <TableCell className="font-mono text-xs">{user.password}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => {
                          setEmail(user.email);
                          setPassword(user.password);
                          void signInWithCredentials(user.email, user.password);
                        }}
                      >
                        Entrar
                      </Button>
                      {user.onboarding ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={loading}
                          onClick={() => {
                            setEmail(user.email);
                            setPassword(user.password);
                            void signInWithCredentials(
                              user.email,
                              user.password,
                              "/panel/onboarding",
                            );
                          }}
                        >
                          Onboarding
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}

function GoogleAuthButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full bg-white text-black hover:bg-black/[.03]"
      disabled={disabled}
      onClick={onClick}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      ) : (
        <GoogleIcon />
      )}
      {loading ? "Conectando con Google…" : label}
    </Button>
  );
}

function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">o</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.92A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.92v-2.6H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.52l3.35-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.95 5.48l3.35 2.6c.79-2.37 3-4.13 5.6-4.13Z"
      />
    </svg>
  );
}
