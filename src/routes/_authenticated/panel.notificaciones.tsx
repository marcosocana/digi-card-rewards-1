import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus, Send, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminScope } from "@/lib/session";
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
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";

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
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    url: "",
    segmentId: "",
    scheduled: "",
  });
  const [segmentForm, setSegmentForm] = useState({ name: "", type: "marketing", value: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications", orgId, isSuperadmin, locationId],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let notificationsQuery = supabase
        .from("notifications")
        .select(
          "id,title,message,status,kind,scheduled_for,created_at,recipient_count,delivered_count,failed_count,customer_segments(name),organizations(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (orgId) notificationsQuery = notificationsQuery.eq("organization_id", orgId);
      if (locationId) notificationsQuery = notificationsQuery.eq("location_id", locationId);

      const segmentsQuery = orgId
        ? supabase
            .from("customer_segments")
            .select("id,name,description")
            .eq("organization_id", orgId)
            .eq("status", "active")
            .order("name")
        : Promise.resolve({ data: [], error: null });
      const organizationQuery = orgId
        ? supabase
            .from("organizations")
            .select("notification_daily_limit,timezone")
            .eq("id", orgId)
            .single()
        : Promise.resolve({ data: null, error: null });
      const locationsQuery = orgId
        ? supabase
            .from("locations")
            .select("id,name")
            .eq("organization_id", orgId)
            .eq("status", "active")
            .order("name")
        : Promise.resolve({ data: [], error: null });
      const [notifications, segments, organization, locations] = await Promise.all([
        notificationsQuery,
        segmentsQuery,
        organizationQuery,
        locationsQuery,
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
        limit: organization.data?.notification_daily_limit ?? 3,
        manualToday,
        segmentCounts,
        locations: locations.data ?? [],
      };
    },
  });

  useEffect(() => {
    let active = true;
    setPreview(0);
    setPreviewLoading(Boolean(form.segmentId));
    if (!form.segmentId) return () => undefined;
    void supabase.rpc("preview_segment_count", { _segment_id: form.segmentId }).then(({ data }) => {
      if (active) {
        setPreview(data ?? 0);
        setPreviewLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [form.segmentId]);

  useEffect(() => {
    if (!open || !data?.segments.length) return;
    setForm((current) => {
      if (data.segments.some((segment) => segment.id === current.segmentId)) return current;
      const defaultSegment =
        data.segments.find((segment) => segment.name.toLocaleLowerCase().includes("todos")) ??
        data.segments[0];
      return { ...current, segmentId: defaultSegment.id };
    });
  }, [data?.segments, open]);

  const effectiveLocationId =
    locationId ?? (data?.locations.length === 1 ? data.locations[0].id : null);
  const hasTitle = form.title.trim().length > 0;
  const hasMessage = form.message.trim().length > 0;
  const hasRecipients = Boolean(form.segmentId) && !previewLoading && preview > 0;
  const isReadyToSend = Boolean(
    orgId && effectiveLocationId && hasTitle && hasMessage && hasRecipients && !busy,
  );

  const send = async () => {
    if (!orgId) {
      toast.error("Selecciona una empresa");
      return;
    }
    if (!form.segmentId) {
      toast.error("Selecciona los destinatarios");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Escribe el título de la notificación");
      return;
    }
    if (!form.message.trim()) {
      toast.error("Escribe el mensaje de la notificación");
      return;
    }
    if (!effectiveLocationId) {
      toast.error("Selecciona un establecimiento", {
        description: "Las notificaciones se envían siempre desde un establecimiento concreto.",
      });
      return;
    }
    setBusy(true);
    const { data: result, error } = await supabase.rpc("queue_manual_notification", {
      _organization_id: orgId,
      _location_id: effectiveLocationId,
      _segment_id: form.segmentId,
      _title: form.title.trim(),
      _message: form.message.trim(),
      ...(form.url.trim() ? { _destination_url: form.url.trim() } : {}),
      ...(form.scheduled ? { _scheduled_for: new Date(form.scheduled).toISOString() } : {}),
      _idempotency_key: crypto.randomUUID(),
    });
    if (error) {
      setBusy(false);
      toast.error(
        error.message.includes("DAILY_NOTIFICATION_LIMIT")
          ? "Ya se alcanzó el límite diario de notificaciones"
          : "No se pudo preparar la notificación",
        { description: error.message },
      );
      return;
    }
    const response = result as {
      notification_id?: string;
      recipient_count?: number;
      status?: string;
    };
    let deliveryDescription = `${num(response.recipient_count)} destinatarios.`;
    if (response.notification_id) {
      const { data: delivery, error: deliveryError } = await supabase.functions.invoke<{
        delivered?: number;
        failed?: number;
        error?: string;
      }>("send-google-wallet-notification", {
        body: { notificationId: response.notification_id },
      });
      if (deliveryError) {
        deliveryDescription += " La notificación quedó en cola; Google Wallet no pudo procesarla.";
      } else {
        deliveryDescription += ` ${num(delivery?.delivered)} entregas en Google Wallet`;
        if (delivery?.failed) deliveryDescription += ` y ${num(delivery.failed)} no entregadas`;
        deliveryDescription += ".";
      }
    }
    setBusy(false);
    toast.success(form.scheduled ? "Notificación programada" : "Envío a Google Wallet procesado", {
      description: deliveryDescription,
    });
    setOpen(false);
    setForm({ title: "", message: "", url: "", segmentId: "", scheduled: "" });
    void refetch();
  };

  const createSegment = async () => {
    if (!orgId || segmentForm.name.trim().length < 2) {
      toast.error("Indica un nombre para el segmento");
      return;
    }
    const numeric = Math.max(0, Number(segmentForm.value) || 0);
    const definition: Record<string, string | number> = { type: segmentForm.type };
    if (["new", "inactive"].includes(segmentForm.type)) definition["days"] = numeric || 30;
    if (segmentForm.type === "recurrent") definition["visits"] = numeric || 3;
    if (segmentForm.type === "near_reward") definition["distance"] = numeric || 20;
    if (["spend", "vip"].includes(segmentForm.type))
      definition["minimum_cents"] = Math.round((numeric || 100) * 100);
    if (segmentForm.type === "location") {
      if (!segmentForm.value) {
        toast.error("Selecciona una ubicación");
        return;
      }
      definition["location_id"] = segmentForm.value;
    }
    const { error } = await supabase.from("customer_segments").insert({
      organization_id: orgId,
      name: segmentForm.name.trim(),
      definition,
    });
    if (error) {
      toast.error("No se pudo crear el segmento", { description: error.message });
      return;
    }
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
              <Button disabled={!canMutate || (data?.manualToday ?? 0) >= (data?.limit ?? 3)}>
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
                      {!data?.segments.length ? (
                        <SelectItem value="no-segments" disabled>
                          No hay segmentos disponibles
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {previewLoading
                      ? "Calculando destinatarios…"
                      : `${num(preview)} clientes con consentimiento comercial.`}
                  </p>
                  {!form.segmentId ? (
                    <p className="text-xs text-destructive">Selecciona los destinatarios.</p>
                  ) : !previewLoading && preview === 0 ? (
                    <p className="text-xs text-destructive">
                      Este segmento no tiene clientes que puedan recibir la notificación.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nt">Título</Label>
                  <Input
                    id="nt"
                    maxLength={80}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  {!hasTitle ? (
                    <p className="text-xs text-destructive">El título es obligatorio.</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nm">Mensaje</Label>
                  <Textarea
                    id="nm"
                    maxLength={500}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                  {!hasMessage ? (
                    <p className="text-xs text-destructive">El mensaje es obligatorio.</p>
                  ) : null}
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
                  En Google Wallet el mensaje se guarda en la tarjeta y se solicita una notificación
                  de Android. La recepción depende de que el cliente haya añadido la tarjeta y tenga
                  activadas las notificaciones de Wallet.
                </p>
                {!effectiveLocationId ? (
                  <p className="text-xs text-destructive">
                    Selecciona un establecimiento en el menú para poder enviar.
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button disabled={!isReadyToSend} onClick={() => void send()}>
                  <Send className="size-4" />{" "}
                  {busy ? "Preparando…" : form.scheduled ? "Programar" : "Enviar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {isGlobal ? <AdminScopeNotice action="crear envíos para esa empresa" /> : null}
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
              <Button variant="outline" disabled={!canMutate}>
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
                  {isSuperadmin
                    ? ` · ${(item.organizations as { display_name: string } | null)?.display_name ?? "Sin empresa"}`
                    : ""}
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
