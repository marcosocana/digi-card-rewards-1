import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScope } from "@/lib/session";
import { dateTime } from "@/lib/format";

export function ActivityLog() {
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
    <section>
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold">Actividad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro auditable de acciones sensibles.
        </p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="surface divide-y overflow-hidden">
          {data?.length ? (
            data.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {activity.entity_type} · {activity.actor_label ?? "sistema"}
                    {isSuperadmin
                      ? ` · ${(activity.organizations as { display_name: string } | null)?.display_name ?? "Sin empresa"}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {dateTime(activity.created_at)}
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
    </section>
  );
}
