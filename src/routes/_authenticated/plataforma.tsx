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
import { num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plataforma")({
  component: PlataformaPage,
});

function PlataformaPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["platform-orgs"],
    enabled: session?.isSuperadmin === true,
    queryFn: async () => {
      const [orgs, locs, members, admins] = await Promise.all([
        supabase.from("organizations").select("id, display_name, slug, status"),
        supabase.from("locations").select("id", { count: "exact", head: true }),
        supabase.from("memberships").select("id", { count: "exact", head: true }),
        supabase
          .from("organization_users")
          .select("id, full_name, invited_email, status, user_id, organization_id, organizations(display_name)")
          .eq("role", "admin")
          .order("full_name"),
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
      };
    },
  });

  return (
    <AppShell>
      {!session?.isSuperadmin ? (
        <EmptyState title="Acceso restringido" description="Esta sección es solo para el equipo de la plataforma." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <PageHeader title="Plataforma" description="Visión global de empresas, administradores y actividad." />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Empresas" value={num(data?.orgs.length)} />
            <MetricCard label="Administradores" value={num(data?.admins.length)} />
            <MetricCard label="Establecimientos" value={num(data?.locations)} />
            <MetricCard label="Miembros" value={num(data?.members)} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="surface overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="font-display font-semibold">Empresas</h2>
                <p className="text-xs text-muted-foreground">Organizaciones gestionadas en la plataforma.</p>
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
                <p className="text-xs text-muted-foreground">Responsables principales de cada organización.</p>
              </div>
              <div className="divide-y">
                {(data?.admins ?? []).map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{admin.full_name ?? admin.invited_email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {admin.invited_email} · {(admin.organizations as { display_name: string } | null)?.display_name}
                      </p>
                    </div>
                    <Badge variant="secondary">{admin.user_id ? "Activo" : "Pendiente"}</Badge>
                  </div>
                ))}
                {!data?.admins.length ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">Todavía no hay administradores.</p>
                ) : null}
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
