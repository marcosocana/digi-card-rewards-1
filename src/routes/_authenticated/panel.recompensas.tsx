import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { useAdminScope } from "@/lib/session";
import { num } from "@/lib/format";
import { loyaltyModuleTabs, ModuleTabs } from "@/components/app/module-tabs";
import {
  ProgramMechanicSwitch,
  type ProgramMechanic,
} from "@/components/app/program-mechanic-switch";
import { setProgramMechanic } from "@/lib/loyalty-program";

export const Route = createFileRoute("/_authenticated/panel/recompensas")({
  component: RecompensasPage,
});

function RecompensasPage() {
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
  const [switching, setSwitching] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    points_cost: 100,
    limitType: "unlimited",
    limitCount: 2,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rewards", orgId, isSuperadmin, locationId],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let programsQuery = supabase
        .from("loyalty_programs")
        .select(
          "id,organization_id,mechanic_type,mechanic_config,organizations(display_name),program_locations!inner(location_id)",
        )
        .order("created_at");
      if (orgId) programsQuery = programsQuery.eq("organization_id", orgId);
      if (locationId) programsQuery = programsQuery.eq("program_locations.location_id", locationId);
      const { data: programs, error: programsError } = await programsQuery;
      if (programsError) throw programsError;
      if (!programs?.length) return { programId: null, mechanicType: "points", rewards: [] };
      const programById = new Map(programs.map((program) => [program.id, program]));
      let rewardsQuery = supabase
        .from("rewards")
        .select(
          "id, name, description, points_cost, status, program_id, mechanic_type,redemption_limit_type,redemption_limit_count,reward_locations!inner(location_id)",
        )
        .in(
          "program_id",
          programs.map((program) => program.id),
        )
        .order("points_cost");
      if (locationId) rewardsQuery = rewardsQuery.eq("reward_locations.location_id", locationId);
      if (programs.length === 1) {
        rewardsQuery = rewardsQuery.eq(
          "mechanic_type",
          programs[0].mechanic_type === "stamps" ? "stamps" : "points",
        );
      }
      const { data: rewards, error } = await rewardsQuery;
      if (error) throw error;
      return {
        programId: programs.length === 1 ? programs[0].id : null,
        mechanicType: programs.length === 1 ? programs[0].mechanic_type : "points",
        rewards: (rewards ?? []).map((reward) => ({
          ...reward,
          organizationName: (
            programById.get(reward.program_id)?.organizations as {
              display_name: string;
            } | null
          )?.display_name,
        })),
      };
    },
  });

  const create = async () => {
    if (!data?.programId) return;
    const isStamps = data.mechanicType === "stamps";
    if (form.name.trim().length < 2 || (!isStamps && form.points_cost < 1)) {
      toast.error("Revisa el nombre y el coste en puntos");
      return;
    }
    if (
      ["per_customer", "global"].includes(form.limitType) &&
      (!Number.isInteger(form.limitCount) || form.limitCount < 1)
    ) {
      toast.error("Indica un límite de canjes válido");
      return;
    }
    const previouslyActive = isStamps
      ? data.rewards.find((reward) => reward.status === "active")?.id
      : undefined;
    if (isStamps && previouslyActive) {
      const paused = await supabase
        .from("rewards")
        .update({ status: "paused" })
        .eq("program_id", data.programId)
        .eq("mechanic_type", "stamps")
        .eq("status", "active");
      if (paused.error) {
        toast.error("No se pudo cambiar la recompensa activa", {
          description: paused.error.message,
        });
        return;
      }
    }
    const { data: created, error } = await supabase
      .from("rewards")
      .insert({
        program_id: data.programId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        mechanic_type: isStamps ? "stamps" : "points",
        points_cost: isStamps ? 1 : form.points_cost,
        redemption_limit_type: isStamps
          ? "unlimited"
          : form.limitType === "once"
            ? "per_customer"
            : form.limitType,
        redemption_limit_count:
          isStamps || form.limitType === "unlimited"
            ? null
            : form.limitType === "once"
              ? 1
              : form.limitCount,
        status: "active",
      })
      .select("id")
      .single();
    if (error) {
      if (previouslyActive) {
        await supabase.from("rewards").update({ status: "active" }).eq("id", previouslyActive);
      }
      toast.error("No se pudo crear", { description: error.message });
      return;
    }
    if (locationId) {
      const { error: locationError } = await supabase
        .from("reward_locations")
        .insert({ reward_id: created.id, location_id: locationId });
      if (locationError)
        return toast.error("La recompensa se creó sin asociar al establecimiento", {
          description: locationError.message,
        });
    }
    toast.success("Recompensa creada");
    setOpen(false);
    setForm({
      name: "",
      description: "",
      points_cost: 100,
      limitType: "unlimited",
      limitCount: 2,
    });
    void refetch();
  };

  const toggle = async (id: string, active: boolean) => {
    if (active && data?.mechanicType === "stamps" && data.programId) {
      const { error: pauseError } = await supabase
        .from("rewards")
        .update({ status: "paused" })
        .eq("program_id", data.programId)
        .eq("mechanic_type", "stamps")
        .neq("id", id)
        .eq("status", "active");
      if (pauseError) {
        toast.error("No se pudo cambiar la recompensa activa", {
          description: pauseError.message,
        });
        return;
      }
    }
    const { error } = await supabase
      .from("rewards")
      .update({ status: active ? "active" : "paused" })
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    void refetch();
  };

  const changeMechanic = async (mechanic: ProgramMechanic) => {
    if (!data?.programId || !locationId || mechanic === data.mechanicType) return;
    setSwitching(true);
    try {
      await setProgramMechanic(data.programId, locationId, mechanic);
      toast.success(
        mechanic === "stamps" ? "Programa cambiado a Sellos" : "Programa cambiado a Puntos",
      );
      await refetch();
    } catch (error) {
      toast.error("No se pudo cambiar el tipo de programa", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Programa de fidelización"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canMutate}>
                <Plus aria-hidden className="size-4" /> Nueva recompensa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva recompensa</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rn">Nombre</Label>
                  <Input
                    id="rn"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                {data?.mechanicType !== "stamps" ? (
                  <div className="space-y-1.5">
                    <Label>Límite de canjes</Label>
                    <Select
                      value={form.limitType}
                      onValueChange={(limitType) => setForm({ ...form, limitType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Ilimitados</SelectItem>
                        <SelectItem value="once">Una única vez por persona</SelectItem>
                        <SelectItem value="per_customer">Varias veces por persona</SelectItem>
                        <SelectItem value="global">Número máximo global</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {data?.mechanicType !== "stamps" &&
                (form.limitType === "per_customer" || form.limitType === "global") ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="reward-limit">
                      {form.limitType === "global"
                        ? "Canjes totales disponibles"
                        : "Canjes por persona"}
                    </Label>
                    <Input
                      id="reward-limit"
                      type="number"
                      min="1"
                      value={form.limitCount}
                      onChange={(event) =>
                        setForm({ ...form, limitCount: Math.max(1, Number(event.target.value)) })
                      }
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="rd">Descripción</Label>
                  <Textarea
                    id="rd"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                {data?.mechanicType !== "stamps" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="rp">Coste en puntos</Label>
                    <Input
                      id="rp"
                      type="number"
                      min="1"
                      value={form.points_cost}
                      onChange={(e) => setForm({ ...form, points_cost: Number(e.target.value) })}
                    />
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button onClick={() => void create()}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {data?.programId ? (
        <ProgramMechanicSwitch
          value={data.mechanicType === "stamps" ? "stamps" : "points"}
          onChange={(value) => void changeMechanic(value)}
          disabled={switching}
        />
      ) : null}
      <ModuleTabs tabs={loyaltyModuleTabs} />

      {isGlobal ? <AdminScopeNotice action="crear una recompensa para esa empresa" /> : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : data?.rewards.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.rewards.map((r) => (
            <div key={r.id} className="surface flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                {data.mechanicType !== "stamps" ? (
                  <Badge variant="secondary" className="shrink-0 font-mono">
                    {num(r.points_cost)} pts
                  </Badge>
                ) : null}
              </div>
              {r.description ? (
                <p className="text-sm text-muted-foreground">{r.description}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {r.redemption_limit_type === "unlimited"
                  ? "Canjes ilimitados"
                  : r.redemption_limit_type === "global"
                    ? `${num(r.redemption_limit_count)} canjes globales como máximo`
                    : r.redemption_limit_count === 1
                      ? "Un canje por persona"
                      : `${num(r.redemption_limit_count)} canjes por persona`}
              </p>
              {isSuperadmin ? (
                <p className="text-xs text-muted-foreground">
                  {r.organizationName ?? "Sin empresa"}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  {r.status === "active" ? "Visible" : "Pausada"}
                </span>
                <Switch
                  checked={r.status === "active"}
                  onCheckedChange={(v) => void toggle(r.id, v)}
                  aria-label={`Activar ${r.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Gift className="size-8" />}
          title="Aún no hay recompensas"
          description="Crea la primera para que tus clientes tengan un objetivo."
        />
      )}
    </>
  );
}
