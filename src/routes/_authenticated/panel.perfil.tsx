import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSession, sessionQueryKey } from "@/lib/session";
import { roleLabel } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/perfil")({ component: PerfilPage });

function PerfilPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", session?.userId],
    enabled: Boolean(session?.userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", session!.userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(
    () =>
      setForm({
        fullName: profile?.full_name ?? session?.fullName ?? "",
        phone: profile?.phone ?? "",
      }),
    [profile, session?.fullName],
  );

  const saveProfile = async () => {
    if (!session || form.fullName.trim().length < 2)
      return toast.error("Indica tu nombre completo");
    setSaving(true);
    const [profileResult, teamResult] = await Promise.all([
      supabase.from("profiles").upsert({
        id: session.userId,
        email: session.email,
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
      }),
      session.org
        ? supabase
            .from("organization_users")
            .update({ full_name: form.fullName.trim() })
            .eq("id", session.org.id)
        : Promise.resolve({ error: null }),
    ]);
    setSaving(false);
    const error = profileResult.error ?? teamResult.error;
    if (error)
      return toast.error("No se pudo actualizar el perfil", { description: error.message });
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    toast.success("Perfil actualizado");
  };

  const changePassword = async () => {
    if (password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
      return toast.error("No se pudo cambiar la contraseña", { description: error.message });
    setPassword("");
    toast.success("Contraseña actualizada");
  };

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Gestiona tus datos personales y el acceso a tu cuenta."
      />
      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-5">
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <UserRound className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Datos personales</h2>
                <p className="text-xs text-muted-foreground">
                  La información visible para tu organización.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nombre completo</Label>
                <Input
                  id="profile-name"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={session?.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">Teléfono</Label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <div className="flex h-10 items-center">
                  <Badge variant="secondary">
                    {session?.isSuperadmin
                      ? "Superadmin"
                      : (roleLabel[session?.org?.role ?? ""] ?? session?.org?.role)}
                  </Badge>
                </div>
              </div>
            </div>
            <Button className="mt-6" disabled={saving} onClick={() => void saveProfile()}>
              <Save className="size-4" />
              {saving ? "Guardando…" : "Guardar perfil"}
            </Button>
          </section>
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <KeyRound className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Cambiar contraseña</h2>
                <p className="text-xs text-muted-foreground">Usa al menos 8 caracteres.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Nueva contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button variant="outline" onClick={() => void changePassword()}>
                Actualizar contraseña
              </Button>
            </div>
          </section>
        </div>
        <aside className="surface h-fit p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Store className="size-5 text-primary" />
            <h2 className="font-display text-lg font-bold">Establecimientos</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Locales a los que tienes acceso.</p>
          <div className="mt-5 space-y-2">
            {session?.locations.length ? (
              session.locations.map((location) => (
                <div
                  key={location.id}
                  className="rounded-xl border bg-muted/35 px-4 py-3 text-sm font-medium"
                >
                  {location.name}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin establecimientos asignados.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
