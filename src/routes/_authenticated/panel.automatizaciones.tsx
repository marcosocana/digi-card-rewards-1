import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Play, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";
import { communicationsModuleTabs, ModuleTabs } from "@/components/app/module-tabs";

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

const availableTriggers = ["welcome", "reward_earned", "inactivity", "birthday"] as const;

const emptyAutomation = {
  name: "",
  triggerType: "welcome" as (typeof availableTriggers)[number],
  title: "",
  message: "",
  destinationUrl: "",
  delayMinutes: 0,
  inactivityDays: 60,
  isActive: true,
};

function AutomatizacionesPage() {
  const {
    session,
    organizationId: orgId,
    isSuperadmin,
    isGlobal,
    canMutate,
    selectedLocationIds,
  } = useAdminScope();
  const locationId = selectedLocationIds[0] ?? null;
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyAutomation);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["automations", orgId, isSuperadmin, locationId],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let automationsQuery = supabase
        .from("notification_automations")
        .select("*, organizations(display_name)")
        .order("created_at");
      let jobsQuery = supabase
        .from("automation_jobs")
        .select("id,status,notification_automations!inner(location_id)");
      if (orgId) {
        automationsQuery = automationsQuery.eq("organization_id", orgId);
        jobsQuery = jobsQuery.eq("organization_id", orgId);
      }
      if (locationId) {
        automationsQuery = automationsQuery.eq("location_id", locationId);
        jobsQuery = jobsQuery.eq("notification_automations.location_id", locationId);
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

  const create = async () => {
    const name = form.name.trim();
    const title = form.title.trim();
    const message = form.message.trim();
    const destinationUrl = form.destinationUrl.trim();
    if (!orgId || !locationId) {
      toast.error("Selecciona un único establecimiento");
      return;
    }
    if (name.length < 2) {
      toast.error("Escribe un nombre para identificar la automatización");
      return;
    }
    if (!title || title.length > 80) {
      toast.error("El título debe tener entre 1 y 80 caracteres");
      return;
    }
    if (!message || message.length > 500) {
      toast.error("El mensaje debe tener entre 1 y 500 caracteres");
      return;
    }
    if (!Number.isInteger(form.delayMinutes) || form.delayMinutes < 0) {
      toast.error("El retraso debe ser un número entero igual o mayor que cero");
      return;
    }
    if (
      form.triggerType === "inactivity" &&
      (!Number.isInteger(form.inactivityDays) || form.inactivityDays < 1)
    ) {
      toast.error("Indica al menos un día de inactividad");
      return;
    }
    if (destinationUrl) {
      try {
        const parsed = new URL(destinationUrl);
        if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error();
      } catch {
        toast.error("El enlace de destino no es válido");
        return;
      }
    }

    setCreating(true);
    const { error } = await supabase.from("notification_automations").insert({
      organization_id: orgId,
      location_id: locationId,
      name,
      trigger_type: form.triggerType,
      title,
      message,
      destination_url: destinationUrl || null,
      delay_minutes: form.delayMinutes,
      conditions: form.triggerType === "inactivity" ? { days: form.inactivityDays } : {},
      is_active: form.isActive,
    });
    setCreating(false);
    if (error) {
      toast.error("No se pudo crear la automatización", {
        description:
          error.code === "23505" ? "Ya existe una automatización con ese nombre." : error.message,
      });
      return;
    }
    toast.success("Automatización creada");
    setForm(emptyAutomation);
    setOpen(false);
    void refetch();
  };

  const run = async () => {
    if (!orgId || !locationId) return;
    const scheduled = await supabase.rpc("enqueue_scheduled_automations", {
      _organization_id: orgId,
      _location_id: locationId,
    });
    if (scheduled.error) {
      toast.error("No se pudo preparar la ejecución", {
        description: scheduled.error.message,
      });
      return;
    }
    const processed = await supabase.rpc("process_automation_jobs", {
      _organization_id: orgId,
      _location_id: locationId,
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
        title="Comunicación"
        description="Mensajes activados por comportamiento, fechas y recompensas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={isGlobal || !locationId} onClick={() => void run()}>
              <Play className="size-4" /> Ejecutar cola ahora
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canMutate || isGlobal || !locationId}>
                  <Plus className="size-4" /> Nueva automatización
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Nueva automatización</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-name">Nombre interno</Label>
                    <Input
                      id="automation-name"
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="Ej. Bienvenida nuevos clientes"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Se activa</Label>
                    <Select
                      value={form.triggerType}
                      onValueChange={(triggerType) =>
                        setForm({
                          ...form,
                          triggerType: triggerType as (typeof availableTriggers)[number],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTriggers.map((trigger) => (
                          <SelectItem key={trigger} value={trigger}>
                            {triggerLabel[trigger]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.triggerType === "inactivity" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="automation-days">Días sin actividad</Label>
                      <Input
                        id="automation-days"
                        type="number"
                        min="1"
                        max="3650"
                        value={form.inactivityDays}
                        onChange={(event) =>
                          setForm({ ...form, inactivityDays: Number(event.target.value) })
                        }
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-delay">Retraso desde el evento (minutos)</Label>
                    <Input
                      id="automation-delay"
                      type="number"
                      min="0"
                      max="525600"
                      value={form.delayMinutes}
                      onChange={(event) =>
                        setForm({ ...form, delayMinutes: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-title">Título de la notificación</Label>
                    <Input
                      id="automation-title"
                      value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      maxLength={80}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {form.title.length}/80
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-message">Mensaje</Label>
                    <Textarea
                      id="automation-message"
                      rows={4}
                      value={form.message}
                      onChange={(event) => setForm({ ...form, message: event.target.value })}
                      maxLength={500}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {form.message.length}/500
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-url">Enlace de destino (opcional)</Label>
                    <Input
                      id="automation-url"
                      type="url"
                      value={form.destinationUrl}
                      onChange={(event) => setForm({ ...form, destinationUrl: event.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <label className="flex items-center justify-between gap-4 rounded-xl border p-3">
                    <span>
                      <span className="block text-sm font-medium">Activar al crear</span>
                      <span className="block text-xs text-muted-foreground">
                        Empezará a generar envíos cuando se cumpla el evento.
                      </span>
                    </span>
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(isActive) => setForm({ ...form, isActive })}
                    />
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => void create()}
                    disabled={
                      creating ||
                      form.name.trim().length < 2 ||
                      !form.title.trim() ||
                      !form.message.trim()
                    }
                  >
                    {creating ? "Creando…" : "Crear automatización"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <ModuleTabs tabs={communicationsModuleTabs} />
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
