import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus, Send, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { dateTime, num } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/panel/notificaciones")({
  component: NotificacionesPage,
});

const labels: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  queued: "En cola",
  processing: "Enviando",
  sent: "Enviada",
  partial: "Parcial",
  failed: "Fallida",
};

function NotificacionesPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);
  const [form, setForm] = useState({
    title: "",
    message: "",
    url: "",
    segmentId: "",
    scheduled: "",
  });
  const [segmentForm, setSegmentForm] = useState({ name: "", type: "marketing", value: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [notifications, segments, organization, locations] = await Promise.all([
        supabase
          .from("notifications")
          .select(
            "id,title,message,status,kind,scheduled_for,created_at,recipient_count,delivered_count,failed_count,customer_segments(name)",
          )
          .eq("organization_id", orgId!)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("customer_segments")
          .select("id,name,description")
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("organizations")
          .select("notification_daily_limit,timezone")
          .eq("id", orgId!)
          .single(),
        supabase
          .from("locations")
          .select("id,name")
          .eq("organization_id", orgId!)
          .eq("status", "active")
          .order("name"),
      ]);
      if (notifications.error) throw notifications.error;
      if (segments.error) throw segments.error;
      const today = new Date().toISOString().slice(0, 10);
      const manualToday = (notifications.data ?? []).filter(
        (item) =>
          item.kind === "manual" &&
          !["draft", "failed", "cancelled"].includes(item.status) &&
          (item.scheduled_for ?? item.created_at).slice(0, 10) === today,
      ).length;
      const segmentCounts = Object.fromEntries(
        await Promise.all(
          (segments.data ?? []).map(async (segment) => {
            const { data: count } = await supabase.rpc("preview_segment_count", {
              _segment_id: segment.id,
            });
            return [segment.id, count ?? 0] as const;
          }),
        ),
      );
      return {
        notifications: notifications.data ?? [],
        segments: segments.data ?? [],
        limit: organization.data?.notification_daily_limit ?? 1,
        manualToday,
        segmentCounts,
        locations: locations.data ?? [],
      };
    },
  });

  useEffect(() => {
    if (!form.segmentId) return setPreview(0);
    void supabase
      .rpc("preview_segment_count", { _segment_id: form.segmentId })
      .then(({ data }) => setPreview(data ?? 0));
  }, [form.segmentId]);

  const send = async () => {
    if (!orgId || !form.segmentId || !form.title.trim() || !form.message.trim())
      { toast.error("Completa título, mensaje y destinatarios"); return; }
    setBusy(true);
    const { data: result, error } = await supabase.rpc("queue_manual_notification", {
      _organization_id: orgId,
      _segment_id: form.segmentId,
      _title: form.title.trim(),
      _message: form.message.trim(),
      _destination_url: form.url.trim() || undefined,
      _scheduled_for: form.scheduled ? new Date(form.scheduled).toISOString() : undefined,
      _idempotency_key: crypto.randomUUID(),
    });
    setBusy(false);
    if (error)
      { toast.error(
        error.message.includes("DAILY_NOTIFICATION_LIMIT")
          ? "Ya se alcanzó el límite diario de notificaciones"
          : "No se pudo preparar la notificación",
        { description: error.message },
      ); return; }
    const response = result as { recipient_count?: number; status?: string };
    toast.success(form.scheduled ? "Notificación programada" : "Notificación añadida a la cola", {
      description: `${num(response.recipient_count)} destinatarios. Los pases sandbox permanecen en modo demo.`,
    });
    setOpen(false);
    setForm({ title: "", message: "", url: "", segmentId: "", scheduled: "" });
    void refetch();
  };

  const createSegment = async () => {
    if (!orgId || segmentForm.name.trim().length < 2)
      { toast.error("Indica un nombre para el segmento"); return; }
    const numeric = Math.max(0, Number(segmentForm.value) || 0);
    const definition: Record<string, string | number> = { type: segmentForm.type };
    if (["new", "inactive"].includes(segmentForm.type)) definition.days = numeric || 30;
    if (segmentForm.type === "recurrent") definition.visits = numeric || 3;
    if (segmentForm.type === "near_reward") definition.distance = numeric || 20;
    if (["spend", "vip"].includes(segmentForm.type))
      definition.minimum_cents = Math.round((numeric || 100) * 100);
    if (segmentForm.type === "location") {
      if (!segmentForm.value) { toast.error("Selecciona una ubicación"); return; }
      definition.location_id = segmentForm.value;
    }
    const { error } = await supabase.from("customer_segments").insert({
      organization_id: orgId,
      name: segmentForm.name.trim(),
      definition,
    });
    if (error) { toast.error("No se pudo crear el segmento", { description: error.message }); return; }
    toast.success("Segmento dinámico creado");
    setSegmentOpen(false);
    setSegmentForm({ name: "", type: "marketing", value: "" });
    void refetch();
  };

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Mensajes Wallet segmentados, con límite diario validado en backend."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={(data?.manualToday ?? 0) >= (data?.limit ?? 1)}>
                <Plus className="size-4" /> Nueva notificación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear notificación</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Destinatarios</Label>
                  <Select
                    value={form.segmentId}
                    onValueChange={(value) => setForm({ ...form, segmentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.segments ?? []).map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {num(preview)} clientes con consentimiento comercial.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nt">Título</Label>
                  <Input
                    id="nt"
                    maxLength={80}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nm">Mensaje</Label>
                  <Textarea
                    id="nm"
                    maxLength={500}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nu">URL de destino (opcional)</Label>
                  <Input
                    id="nu"
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ns">Programar (opcional)</Label>
                  <Input
                    id="ns"
                    type="datetime-local"
                    value={form.scheduled}
                    onChange={(e) => setForm({ ...form, scheduled: e.target.value })}
                  />
                </div>
                <p className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                  Apple Wallet y Google Wallet admiten formatos visuales distintos. Los pases
                  actuales son sandbox y sus entregas quedarán marcadas como “Demo”.
                </p>
              </div>
              <DialogFooter>
                <Button disabled={busy || preview === 0} onClick={() => void send()}>
                  <Send className="size-4" />{" "}
                  {busy ? "Preparando…" : form.scheduled ? "Programar" : "Enviar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Uso diario" value={`${num(data?.manualToday)}/${num(data?.limit)}`} />
        <MetricCard
          label="Destinatarios en histórico"
          value={num(data?.notifications.reduce((sum, item) => sum + item.recipient_count, 0))}
        />
        <MetricCard
          label="Entregas confirmadas"
          value={num(data?.notifications.reduce((sum, item) => sum + item.delivered_count, 0))}
        />
      </div>
      <section className="surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Segmentos dinámicos</h2>
            <p className="text-sm text-muted-foreground">
              Se recalculan sobre los datos actuales antes de cada envío.
            </p>
          </div>
          <Dialog open={segmentOpen} onOpenChange={setSegmentOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UsersRound className="size-4" /> Nuevo segmento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear segmento dinámico</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="segment-name">Nombre</Label>
                  <Input
                    id="segment-name"
                    value={segmentForm.name}
                    onChange={(event) =>
                      setSegmentForm({ ...segmentForm, name: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Regla</Label>
                  <Select
                    value={segmentForm.type}
                    onValueChange={(type) => setSegmentForm({ ...segmentForm, type, value: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los clientes</SelectItem>
                      <SelectItem value="marketing">Con consentimiento comercial</SelectItem>
                      <SelectItem value="new">Clientes nuevos</SelectItem>
                      <SelectItem value="recurrent">Clientes recurrentes</SelectItem>
                      <SelectItem value="inactive">Sin actividad</SelectItem>
                      <SelectItem value="reward_available">Con recompensa disponible</SelectItem>
                      <SelectItem value="near_reward">Próximos a una recompensa</SelectItem>
                      <SelectItem value="birthday">Cumpleaños del mes</SelectItem>
                      <SelectItem value="spend">Gasto mínimo</SelectItem>
                      <SelectItem value="vip">Clientes VIP</SelectItem>
                      <SelectItem value="location">Por ubicación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {segmentForm.type === "location" ? (
                  <div className="space-y-1.5">
                    <Label>Ubicación</Label>
                    <Select
                      value={segmentForm.value}
                      onValueChange={(value) => setSegmentForm({ ...segmentForm, value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {(data?.locations ?? []).map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : ["new", "inactive", "recurrent", "near_reward", "spend", "vip"].includes(
                    segmentForm.type,
                  ) ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="segment-value">
                      {["new", "inactive"].includes(segmentForm.type)
                        ? "Días"
                        : segmentForm.type === "recurrent"
                          ? "Visitas mínimas"
                          : segmentForm.type === "near_reward"
                            ? "Distancia máxima"
                            : "Gasto mínimo (€)"}
                    </Label>
                    <Input
                      id="segment-value"
                      type="number"
                      min="0"
                      value={segmentForm.value}
                      onChange={(event) =>
                        setSegmentForm({ ...segmentForm, value: event.target.value })
                      }
                    />
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button onClick={() => void createSegment()}>Crear segmento</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.segments ?? []).map((segment) => (
            <div key={segment.id} className="rounded-xl border px-4 py-3">
              <p className="text-sm font-medium">{segment.name}</p>
              <p className="text-xs text-muted-foreground">
                {num(data?.segmentCounts[segment.id])} clientes
              </p>
            </div>
          ))}
        </div>
      </section>
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : data?.notifications.length ? (
        <div className="surface divide-y overflow-hidden">
          {data.notifications.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.customer_segments?.name ?? "Automatización"} · {num(item.recipient_count)}{" "}
                  destinatarios · {dateTime(item.scheduled_for ?? item.created_at)}
                </p>
              </div>
              <Badge variant={item.status === "sent" ? "default" : "secondary"}>
                {labels[item.status] ?? item.status}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="size-8" />}
          title="Sin notificaciones"
          description="Crea una notificación y selecciona un segmento de clientes."
        />
      )}
    </>
  );
}
