import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScope } from "@/lib/session";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/actividad")({
  component: ActividadPage,
});

function ActividadPage() {
  const { session, organizationId: orgId, isSuperadmin } = useAdminScope();

  const { data, isLoading } = useQuery({
    queryKey: ["audit", orgId, isSuperadmin],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("id, action, entity_type, actor_label, created_at, organizations(display_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (orgId) query = query.eq("organization_id", orgId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader title="Actividad" description="Registro auditable de acciones sensibles." />
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="surface divide-y overflow-hidden">
          {data?.length ? (
            data.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.entity_type} · {a.actor_label ?? "sistema"}
                    {isSuperadmin
                      ? ` · ${(a.organizations as { display_name: string } | null)?.display_name ?? "Sin empresa"}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {dateTime(a.created_at)}
                </span>
              </div>
            ))
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Sin registros todavía.
            </p>
          )}
        </div>
      )}
    </>
  );
}
