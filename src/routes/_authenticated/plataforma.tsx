import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { dateTime, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plataforma")({
  component: PlataformaPage,
});

function PlataformaPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["platform-orgs"],
    enabled: session?.isSuperadmin === true,
    queryFn: async () => {
      const fetchAllProfiles = async () => {
        const pageSize = 1_000;
        const profiles: Array<{
          id: string;
          email: string | null;
          full_name: string | null;
          platform_role: "superadmin" | "user";
          status: string;
          created_at: string;
        }> = [];
        for (let page = 0; ; page += 1) {
          const response = await supabase
            .from("profiles")
            .select("id, email, full_name, platform_role, status, created_at")
            .order("created_at", { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (response.error) throw response.error;
          profiles.push(...(response.data ?? []));
          if ((response.data?.length ?? 0) < pageSize) break;
        }
        return profiles;
      };

      const [orgs, locs, members, admins, users] = await Promise.all([
        supabase.from("organizations").select("id, display_name, slug, status"),
        supabase.from("locations").select("id", { count: "exact", head: true }),
        supabase.from("memberships").select("id", { count: "exact", head: true }),
        supabase
          .from("organization_users")
          .select(
            "id, full_name, invited_email, status, user_id, organization_id, organizations(display_name)",
          )
          .eq("role", "admin")
          .order("full_name"),
        fetchAllProfiles(),
      ]);
      if (orgs.error) throw orgs.error;
      if (locs.error) throw locs.error;
      if (members.error) throw members.error;
      if (admins.error) throw admins.error;
      return {
        orgs: orgs.data ?? [],
        locations: locs.count ?? 0,
        members: members.count ?? 0,
        admins: admins.data ?? [],
        users,
      };
    },
  });

  return (
    <AppShell>
      {!session?.isSuperadmin ? (
        <EmptyState
          title="Acceso restringido"
          description="Esta sección es solo para el equipo de la plataforma."
        />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <PageHeader
            title="Plataforma"
            description="Visión global de empresas, usuarios registrados, actividad y rendimiento."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Empresas" value={num(data?.orgs.length)} />
            <MetricCard label="Usuarios registrados" value={num(data?.users.length)} />
            <MetricCard label="Administradores" value={num(data?.admins.length)} />
            <MetricCard label="Establecimientos" value={num(data?.locations)} />
            <MetricCard label="Miembros" value={num(data?.members)} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="surface overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="font-display font-semibold">Empresas</h2>
                <p className="text-xs text-muted-foreground">
                  Organizaciones gestionadas en la plataforma.
                </p>
              </div>
              <div className="divide-y">
                {(data?.orgs ?? []).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{o.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">/{o.slug}</p>
                    </div>
                    <Badge variant="secondary">{o.status}</Badge>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="font-display font-semibold">Administradores</h2>
                <p className="text-xs text-muted-foreground">
                  Responsables principales de cada organización.
                </p>
              </div>
              <div className="divide-y">
                {(data?.admins ?? []).map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {admin.full_name ?? admin.invited_email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {admin.invited_email} ·{" "}
                        {(admin.organizations as { display_name: string } | null)?.display_name}
                      </p>
                    </div>
                    <Badge variant="secondary">{admin.user_id ? "Activo" : "Pendiente"}</Badge>
                  </div>
                ))}
                {!data?.admins.length ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    Todavía no hay administradores.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
          <section className="surface overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="font-display font-semibold">Usuarios registrados</h2>
              <p className="text-xs text-muted-foreground">
                Todas las cuentas dadas de alta en la base de datos de Fideleo.
              </p>
            </div>
            <div className="max-h-[32rem] divide-y overflow-y-auto">
              {(data?.users ?? []).map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.full_name || user.email || "Usuario sin nombre"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email || "Sin email"} · Alta {dateTime(user.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">
                      {user.platform_role === "superadmin" ? "Superadmin" : "Usuario"}
                    </Badge>
                    <Badge variant={user.status === "active" ? "default" : "outline"}>
                      {user.status === "active" ? "Activo" : user.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {!data?.users.length ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                  Todavía no hay usuarios registrados.
                </p>
              ) : null}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
