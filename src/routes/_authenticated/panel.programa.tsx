import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/session";
import { ruleText } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/programa")({
  component: ProgramaPage,
});

function ProgramaPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["program", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    public_name: "",
    description: "",
    earning_mode: "points_per_currency_unit",
    earning_value: 1,
    rounding_mode: "floor",
    initial_points: 0,
    allow_earning: true,
    allow_redeeming: true,
    status: "active",
    terms: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      public_name: data.public_name,
      description: data.description ?? "",
      earning_mode: data.earning_mode,
      earning_value: Number(data.earning_value),
      rounding_mode: data.rounding_mode,
      initial_points: data.initial_points,
      allow_earning: data.allow_earning,
      allow_redeeming: data.allow_redeeming,
      status: data.status,
      terms: data.terms ?? "",
    });
  }, [data]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from("loyalty_programs")
      .update({
        public_name: form.public_name,
        description: form.description || null,
        earning_mode: form.earning_mode as "points_per_currency_unit",
        earning_value: form.earning_value,
        rounding_mode: form.rounding_mode as "floor",
        initial_points: form.initial_points,
        allow_earning: form.allow_earning,
        allow_redeeming: form.allow_redeeming,
        status: form.status as "active",
        terms: form.terms || null,
      })
      .eq("id", data.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Programa actualizado");
    void refetch();
  };

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!data) return <EmptyState title="Sin programa configurado" description="Crea un programa desde la plataforma." />;

  return (
    <>
      <PageHeader
        title="Programa de fidelización"
        description={ruleText(form.earning_mode, form.earning_value)}
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Identidad</h2>
          <div className="space-y-1.5">
            <Label htmlFor="pn">Nombre público</Label>
            <Input id="pn" value={form.public_name} onChange={(e) => setForm({ ...form, public_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descripción</Label>
            <Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Condiciones</Label>
            <Textarea id="terms" rows={4} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </div>
        </div>

        <div className="surface space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Reglas de acumulación</h2>
          <div className="space-y-1.5">
            <Label>Modo</Label>
            <Select value={form.earning_mode} onValueChange={(v) => setForm({ ...form, earning_mode: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points_per_currency_unit">Puntos por euro gastado</SelectItem>
                <SelectItem value="currency_units_per_point">Euros necesarios por punto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="val">Valor</Label>
              <Input
                id="val"
                type="number"
                step="0.01"
                min="0.01"
                value={form.earning_value}
                onChange={(e) => setForm({ ...form, earning_value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Redondeo</Label>
              <Select value={form.rounding_mode} onValueChange={(v) => setForm({ ...form, rounding_mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor">Hacia abajo</SelectItem>
                  <SelectItem value="nearest">Al más cercano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="init">Puntos de bienvenida</Label>
            <Input
              id="init"
              type="number"
              min="0"
              value={form.initial_points}
              onChange={(e) => setForm({ ...form, initial_points: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <ToggleRow
              label="Permitir acumular puntos"
              checked={form.allow_earning}
              onChange={(v) => setForm({ ...form, allow_earning: v })}
            />
            <ToggleRow
              label="Permitir canjear recompensas"
              checked={form.allow_redeeming}
              onChange={(v) => setForm({ ...form, allow_redeeming: v })}
            />
            <ToggleRow
              label="Programa activo"
              description="Si lo pausas, la caja dejará de operar."
              checked={form.status === "active"}
              onChange={(v) => setForm({ ...form, status: v ? "active" : "paused" })}
            />
          </div>
        </div>
      </div>
    </>
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
  onChange: (v: boolean) => void;
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
