import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminScope } from "@/lib/session";
import { dateTime, num } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";

export const Route = createFileRoute("/_authenticated/panel/automatizaciones")({
  component: AutomatizacionesPage,
});

const triggerLabel: Record<string, string> = {
  welcome: "Después del registro",
  reward_earned: "Al obtener recompensa",
  inactivity: "Cliente inactivo",
  birthday: "Cumpleaños",
  reward_reminder: "Recordatorio de recompensa",
  points_expiry: "Puntos próximos a caducar",
  post_transaction: "Después de una transacción",
};

function AutomatizacionesPage() {
  const { session, organizationId: orgId, isSuperadmin, isGlobal } = useAdminScope();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["automations", orgId, isSuperadmin],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let automationsQuery = supabase
        .from("notification_automations")
        .select("*, organizations(display_name)")
        .order("created_at");
      let jobsQuery = supabase.from("automation_jobs").select("id,status");
      if (orgId) {
        automationsQuery = automationsQuery.eq("organization_id", orgId);
        jobsQuery = jobsQuery.eq("organization_id", orgId);
      }
      const [automations, jobs] = await Promise.all([automationsQuery, jobsQuery]);
      if (automations.error) throw automations.error;
      return { automations: automations.data ?? [], jobs: jobs.data ?? [] };
    },
  });

  const toggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("notification_automations")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar", { description: error.message });
      return;
    }
    toast.success(isActive ? "Automatización activada" : "Automatización pausada");
    void refetch();
  };

  const run = async () => {
    if (!orgId) return;
    const scheduled = await supabase.rpc("enqueue_scheduled_automations", {
      _organization_id: orgId,
    });
    if (scheduled.error) {
      toast.error("No se pudo preparar la ejecución", {
        description: scheduled.error.message,
      });
      return;
    }
    const processed = await supabase.rpc("process_automation_jobs", {
      _organization_id: orgId,
      _limit: 100,
    });
    if (processed.error) {
      toast.error("No se pudo procesar la cola", { description: processed.error.message });
      return;
    }
    const result = processed.data as { processed?: number; failed?: number };
    toast.success("Cola procesada", {
      description: `${num(result.processed)} trabajos preparados; ${num(result.failed)} fallidos. Las entregas sandbox siguen en modo demo.`,
    });
    void refetch();
  };

  const count = (status: string) => data?.jobs.filter((job) => job.status === status).length ?? 0;
  return (
    <>
      <PageHeader
        title="Automatizaciones"
        description="Mensajes activados por comportamiento, fechas y recompensas."
        actions={
          <Button variant="outline" disabled={isGlobal} onClick={() => void run()}>
            <Play className="size-4" /> Ejecutar cola ahora
          </Button>
        }
      />
      {isGlobal ? <AdminScopeNotice action="ejecutar la cola de esa empresa" /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Activas"
          value={num(data?.automations.filter((item) => item.is_active).length)}
        />
        <MetricCard label="Pendientes" value={num(count("pending"))} />
        <MetricCard label="Completadas" value={num(count("completed"))} />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(data?.automations ?? []).map((automation) => (
            <article key={automation.id} className="surface space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-primary" />
                    <h2 className="font-display text-lg font-semibold">{automation.name}</h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {triggerLabel[automation.trigger_type] ?? automation.trigger_type}
                    {isSuperadmin
                      ? ` · ${(automation.organizations as { display_name: string } | null)?.display_name ?? "Sin empresa"}`
                      : ""}
                  </p>
                </div>
                <Switch
                  checked={automation.is_active}
                  onCheckedChange={(value) => void toggle(automation.id, value)}
                  aria-label={`Activar ${automation.name}`}
                />
              </div>
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-sm font-medium">{automation.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{automation.message}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Última ejecución: {dateTime(automation.last_run_at)}</span>
                <Badge variant="secondary">{automation.is_active ? "Activa" : "Pausada"}</Badge>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
