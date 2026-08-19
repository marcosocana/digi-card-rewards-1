import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/session";
import { num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/recompensas")({
  component: RecompensasPage,
});

function RecompensasPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", points_cost: 100 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rewards", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data: program } = await supabase
        .from("loyalty_programs")
        .select("id")
        .eq("organization_id", orgId!)
        .limit(1)
        .maybeSingle();
      if (!program) return { programId: null, rewards: [] };
      const { data: rewards, error } = await supabase
        .from("rewards")
        .select("id, name, description, points_cost, status")
        .eq("program_id", program.id)
        .order("points_cost");
      if (error) throw error;
      return { programId: program.id, rewards: rewards ?? [] };
    },
  });

  const create = async () => {
    if (!data?.programId) return;
    if (form.name.trim().length < 2 || form.points_cost < 1) {
      toast.error("Revisa el nombre y el coste en puntos");
      return;
    }
    const { error } = await supabase.from("rewards").insert({
      program_id: data.programId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      points_cost: form.points_cost,
      status: "active",
    });
    if (error) {
      toast.error("No se pudo crear", { description: error.message });
      return;
    }
    toast.success("Recompensa creada");
    setOpen(false);
    setForm({ name: "", description: "", points_cost: 100 });
    void refetch();
  };

  const toggle = async (id: string, active: boolean) => {
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

  return (
    <>
      <PageHeader
        title="Recompensas"
        description="Catálogo canjeable por puntos en tus establecimientos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
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
                <div className="space-y-1.5">
                  <Label htmlFor="rd">Descripción</Label>
                  <Textarea
                    id="rd"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
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
              </div>
              <DialogFooter>
                <Button onClick={() => void create()}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : data?.rewards.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.rewards.map((r) => (
            <div key={r.id} className="surface flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{r.name}</h2>
                <Badge variant="secondary" className="shrink-0 font-mono">
                  {num(r.points_cost)} pts
                </Badge>
              </div>
              {r.description ? (
                <p className="text-sm text-muted-foreground">{r.description}</p>
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
