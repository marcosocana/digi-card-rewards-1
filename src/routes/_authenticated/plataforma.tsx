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
      const [orgs, locs, members] = await Promise.all([
        supabase.from("organizations").select("id, display_name, slug, status"),
        supabase.from("locations").select("id", { count: "exact", head: true }),
        supabase.from("memberships").select("id", { count: "exact", head: true }),
      ]);
      return { orgs: orgs.data ?? [], locations: locs.count ?? 0, members: members.count ?? 0 };
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
          <PageHeader title="Plataforma" description="Visión global de empresas y actividad." />
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Empresas" value={num(data?.orgs.length)} />
            <MetricCard label="Establecimientos" value={num(data?.locations)} />
            <MetricCard label="Miembros" value={num(data?.members)} />
          </div>
          <div className="surface divide-y overflow-hidden">
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
        </>
      )}
    </AppShell>
  );
}
