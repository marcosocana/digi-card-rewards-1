import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Puntia" },
      { name: "description", content: "Accede al backoffice de fidelización de Puntia." },
      { property: "og:title", content: "Iniciar sesión — Puntia" },
      { property: "og:description", content: "Acceso para comercios y personal de caja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const demoUsers = [
  { email: "super@cafenorte.es", role: "Superadministrador" },
  { email: "admin@cafenorte.es", role: "Administrador de Café Norte" },
  { email: "malasana@cafenorte.es", role: "Responsable de Malasaña" },
  { email: "empleado@cafenorte.es", role: "Empleado de Malasaña" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido iniciar sesión", { description: error.message });
      return;
    }
    void navigate({ to: "/panel" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error("No hemos podido crear la cuenta", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Revisa tu correo para confirmar la cuenta");
      return;
    }
    void navigate({ to: "/panel" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("No hemos podido continuar con Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/panel" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-xl font-semibold">
          Puntia
        </Link>
        <div className="surface mt-4 p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Contraseña</Label>
                  <Input id="password2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Usa el email al que te invitaron para heredar tu rol automáticamente.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando…" : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continuar con Google
          </Button>
        </div>

        <div className="surface mt-4 p-5">
          <h2 className="text-sm font-semibold">Cuentas demo preparadas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Crea la cuenta con uno de estos emails y el rol se asigna solo.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs">
            {demoUsers.map((u) => (
              <li key={u.email} className="flex justify-between gap-3">
                <button
                  type="button"
                  className="font-medium underline-offset-2 hover:underline"
                  onClick={() => setEmail(u.email)}
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
