import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";
import { EmptyState } from "@/components/app/empty-state";
import { loyaltyModuleTabs, ModuleTabs } from "@/components/app/module-tabs";
import {
  ProgramMechanicSwitch,
  type ProgramMechanic,
} from "@/components/app/program-mechanic-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminScope } from "@/lib/session";
import { setProgramMechanic } from "@/lib/loyalty-program";

export const Route = createFileRoute("/_authenticated/panel/programa")({ component: ProgramaPage });

function ProgramaPage() {
  const { organizationId: orgId, selectedLocationIds } = useAdminScope();
  const locationId = selectedLocationIds.length === 1 ? selectedLocationIds[0] : null;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["program", orgId, locationId],
    enabled: Boolean(orgId && locationId),
    queryFn: async () => {
      const result = await supabase
        .from("loyalty_programs")
        .select("*,program_locations!inner(location_id)")
        .eq("organization_id", orgId!)
        .eq("program_locations.location_id", locationId!)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const [form, setForm] = useState({
    public_name: "",
    description: "",
    earning_mode: "points_per_currency_unit",
    mechanic_type: "points" as ProgramMechanic,
    mechanic_config: {
      stamps_per_purchase: 1,
      stamp_target: 10,
      welcome_stamps: 0,
      stamp_reward_name: "1 café",
    },
    earning_value: 1,
    rounding_mode: "floor",
    initial_points: 0,
    allow_earning: true,
    allow_redeeming: true,
    status: "active",
    terms: "",
  });
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const hydrated = useRef(false);
  const lastSaved = useRef("");

  const changeMechanic = async (mechanic: ProgramMechanic) => {
    if (!data || !locationId || mechanic === form.mechanic_type) return;
    setSwitching(true);
    setForm((current) => ({ ...current, mechanic_type: mechanic }));
    try {
      await setProgramMechanic(data.id, locationId, mechanic);
      toast.success(
        mechanic === "stamps" ? "Programa cambiado a Sellos" : "Programa cambiado a Puntos",
      );
      await refetch();
    } catch (error) {
      setForm((current) => ({
        ...current,
        mechanic_type: mechanic === "stamps" ? "points" : "stamps",
      }));
      toast.error("No se pudo cambiar el tipo de programa", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    if (!data) return;
    const config = (data.mechanic_config ?? {}) as Record<string, unknown>;
    const nextForm = {
      public_name: data.public_name,
      description: data.description ?? "",
      earning_mode: data.earning_mode,
      mechanic_type: data.mechanic_type === "stamps" ? "stamps" : "points",
      mechanic_config: {
        stamps_per_purchase: Number(config.stamps_per_purchase ?? 1),
        stamp_target: Math.min(20, Math.max(5, Number(config.stamp_target ?? 10))),
        welcome_stamps: Number(config.welcome_stamps ?? 0),
        stamp_reward_name: String(config.stamp_reward_name ?? "1 café"),
      },
      earning_value: Number(data.earning_value),
      rounding_mode: data.rounding_mode,
      initial_points: data.initial_points,
      allow_earning: data.allow_earning,
      allow_redeeming: data.allow_redeeming,
      status: data.status,
      terms: data.terms ?? "",
    };
    lastSaved.current = JSON.stringify(nextForm);
    hydrated.current = true;
    setForm(nextForm);
  }, [data]);

  const save = async (snapshot = form) => {
    if (!data || !locationId) return;
    if (!snapshot.public_name.trim()) return;
    const isStamps = snapshot.mechanic_type === "stamps";
    const mechanicConfig = {
      ...snapshot.mechanic_config,
      stamps_per_purchase: Math.min(
        10,
        Math.max(1, Math.round(snapshot.mechanic_config.stamps_per_purchase)),
      ),
      stamp_target: Math.min(20, Math.max(5, Math.round(snapshot.mechanic_config.stamp_target))),
      welcome_stamps: Math.min(
        Math.min(20, Math.max(5, Math.round(snapshot.mechanic_config.stamp_target))) - 1,
        Math.max(0, Math.round(snapshot.mechanic_config.welcome_stamps)),
      ),
      stamp_reward_name: snapshot.mechanic_config.stamp_reward_name.trim() || "1 café",
    };
    setSaving(true);
    const result = await supabase
      .from("loyalty_programs")
      .update({
        public_name: snapshot.public_name.trim(),
        description: snapshot.description.trim() || null,
        earning_mode: snapshot.earning_mode as "points_per_currency_unit",
        mechanic_type: snapshot.mechanic_type,
        mechanic_config: mechanicConfig,
        earning_value: snapshot.earning_value,
        rounding_mode: snapshot.rounding_mode as "floor",
        initial_points: isStamps ? mechanicConfig.welcome_stamps : snapshot.initial_points,
        allow_earning: true,
        allow_redeeming: snapshot.allow_redeeming,
        status: snapshot.status as "active",
        terms: snapshot.terms.trim() || null,
      })
      .eq("id", data.id);
    if (result.error) {
      setSaving(false);
      toast.error("No se pudo guardar", { description: result.error.message });
      return;
    }
    lastSaved.current = JSON.stringify(snapshot);
    setSaving(false);
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!hydrated.current || !data || switching) return;
    const serialized = JSON.stringify(form);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => void saveRef.current(form), 700);
    return () => window.clearTimeout(timer);
  }, [form, data, switching]);

  if (!locationId)
    return (
      <>
        <PageHeader
          title="Programa de fidelización"
          description="Configuración por establecimiento."
        />
        <AdminScopeNotice action="consultar y editar su programa" />
      </>
    );
  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!data)
    return (
      <EmptyState
        title="Sin programa configurado"
        description="Este establecimiento todavía no tiene un programa."
      />
    );

  return (
    <>
      <PageHeader title="Programa de fidelización" />
      <ProgramMechanicSwitch
        value={form.mechanic_type}
        onChange={(value) => void changeMechanic(value)}
        disabled={switching || saving}
      />
      <ModuleTabs tabs={loyaltyModuleTabs} />
      <div className="space-y-4">
        <div className="surface space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Reglas de acumulación</h2>
          {form.mechanic_type === "stamps" ? (
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Sellos por compra" id="stamps">
                  <Input
                    id="stamps"
                    type="number"
                    min="1"
                    max="10"
                    value={form.mechanic_config.stamps_per_purchase}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        mechanic_config: {
                          ...form.mechanic_config,
                          stamps_per_purchase: Number(event.target.value),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Sellos para completar" id="stamp-target">
                  <Select
                    value={String(form.mechanic_config.stamp_target)}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        mechanic_config: {
                          ...form.mechanic_config,
                          stamp_target: Number(value),
                        },
                      })
                    }
                  >
                    <SelectTrigger id="stamp-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 16 }, (_, index) => index + 5).map((target) => (
                        <SelectItem key={target} value={String(target)}>
                          {target} sellos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          ) : (
            <>
              <Field label="Modo">
                <Select
                  value={form.earning_mode}
                  onValueChange={(value) => setForm({ ...form, earning_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points_per_currency_unit">
                      Puntos por euro gastado
                    </SelectItem>
                    <SelectItem value="currency_units_per_point">
                      Euros necesarios por punto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={
                    form.earning_mode === "points_per_currency_unit"
                      ? "Puntos obtenidos por 1 €"
                      : "Euros necesarios para obtener 1 punto"
                  }
                  id="val"
                >
                  <Input
                    id="val"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.earning_value}
                    onChange={(event) =>
                      setForm({ ...form, earning_value: Number(event.target.value) })
                    }
                  />
                  <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">
                    {form.earning_mode === "points_per_currency_unit"
                      ? `1 € = ${form.earning_value || 0} puntos`
                      : `${form.earning_value || 0} € = 1 punto`}
                  </p>
                </Field>
                <Field label="Redondeo">
                  <Select
                    value={form.rounding_mode}
                    onValueChange={(value) => setForm({ ...form, rounding_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="floor">Hacia abajo</SelectItem>
                      <SelectItem value="nearest">Al más cercano</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Puntos de bienvenida" id="init">
                <Input
                  id="init"
                  type="number"
                  min="0"
                  value={form.initial_points}
                  onChange={(event) =>
                    setForm({ ...form, initial_points: Number(event.target.value) })
                  }
                />
              </Field>
            </>
          )}
          <div className="space-y-3 border-t pt-4">
            <ToggleRow
              label="Permitir canjear recompensas"
              checked={form.allow_redeeming}
              onChange={(value) => setForm({ ...form, allow_redeeming: value })}
            />
            <ToggleRow
              label="Programa activo"
              description="Si lo pausas, la caja dejará de operar."
              checked={form.status === "active"}
              onChange={(value) => setForm({ ...form, status: value ? "active" : "paused" })}
            />
          </div>
        </div>
        <div className="surface space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Identidad</h2>
          <Field label="Nombre público" id="pn">
            <Input
              id="pn"
              value={form.public_name}
              onChange={(event) => setForm({ ...form, public_name: event.target.value })}
            />
          </Field>
          <Field label="Descripción" id="desc">
            <Textarea
              id="desc"
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <Field label="Condiciones" id="terms">
            <Textarea
              id="terms"
              rows={4}
              value={form.terms}
              onChange={(event) => setForm({ ...form, terms: event.target.value })}
            />
          </Field>
        </div>
      </div>
    </>
  );
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
