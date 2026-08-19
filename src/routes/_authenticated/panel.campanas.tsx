import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Megaphone, Pause, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { dateOnly } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
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

export const Route = createFileRoute("/_authenticated/panel/campanas")({ component: CampanasPage });

type Campaign = {
  id: string;
  internal_name: string;
  public_name: string;
  description: string | null;
  mechanic_type: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  is_primary: boolean;
};

const statusLabel: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  active: "Activa",
  paused: "Pausada",
  finished: "Finalizada",
  archived: "Archivada",
};

function CampanasPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    internal_name: "",
    public_name: "",
    description: "",
    mechanic_type: "spend",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["campaigns", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [campaigns, program] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .eq("organization_id", orgId)
          .is("archived_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("loyalty_programs")
          .select("id")
          .eq("organization_id", orgId!)
          .limit(1)
          .maybeSingle(),
      ]);
      if (campaigns.error) throw campaigns.error;
      return {
        campaigns: (campaigns.data ?? []) as Campaign[],
        programId: program.data?.id ?? null,
      };
    },
  });

  const create = async () => {
    if (
      !orgId ||
      !data?.programId ||
      form.internal_name.trim().length < 2 ||
      form.public_name.trim().length < 2
    ) {
      toast.error("Completa el nombre interno y el nombre público");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      organization_id: orgId,
      program_id: data.programId,
      internal_name: form.internal_name.trim(),
      public_name: form.public_name.trim(),
      description: form.description.trim() || null,
      mechanic_type: form.mechanic_type,
      status: "draft",
      rules: {},
    });
    setSaving(false);
    if (error) return toast.error("No se pudo crear la campaña", { description: error.message });
    toast.success("Campaña guardada como borrador");
    setOpen(false);
    setForm({ internal_name: "", public_name: "", description: "", mechanic_type: "spend" });
    void refetch();
  };

  const setStatus = async (campaign: Campaign, status: "active" | "paused") => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaign.id);
    if (error) return toast.error("No se pudo actualizar", { description: error.message });
    toast.success(status === "active" ? "Campaña activada" : "Campaña pausada");
    void refetch();
  };

  const duplicate = async (campaign: Campaign) => {
    const { error } = await supabase.from("campaigns").insert({
      organization_id: orgId,
      program_id: data?.programId,
      internal_name: `${campaign.internal_name} (copia)`,
      public_name: campaign.public_name,
      description: campaign.description,
      mechanic_type: campaign.mechanic_type,
      status: "draft",
      is_primary: false,
      rules: {},
    });
    if (error) return toast.error("No se pudo duplicar", { description: error.message });
    toast.success("Campaña duplicada como borrador");
    void refetch();
  };

  return (
    <>
      <PageHeader
        title="Campañas"
        description="Crea, programa y controla las iniciativas de fidelización."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nueva campaña
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva campaña</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ci">Nombre interno</Label>
                  <Input
                    id="ci"
                    value={form.internal_name}
                    onChange={(e) => setForm({ ...form, internal_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp">Nombre público</Label>
                  <Input
                    id="cp"
                    value={form.public_name}
                    onChange={(e) => setForm({ ...form, public_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mecánica</Label>
                  <Select
                    value={form.mechanic_type}
                    onValueChange={(v) => setForm({ ...form, mechanic_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spend">Acumulación por gasto</SelectItem>
                      <SelectItem value="points">Puntos</SelectItem>
                      <SelectItem value="stamps">Sellos (preparada)</SelectItem>
                      <SelectItem value="cashback">Cashback (preparada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cd">Descripción</Label>
                  <Textarea
                    id="cd"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={saving} onClick={() => void create()}>
                  {saving ? "Guardando…" : "Guardar borrador"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : data?.campaigns.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.campaigns.map((campaign) => (
            <article key={campaign.id} className="surface space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{campaign.internal_name}</p>
                  <h2 className="font-display text-lg font-semibold">{campaign.public_name}</h2>
                </div>
                <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                  {statusLabel[campaign.status] ?? campaign.status}
                </Badge>
              </div>
              {campaign.description ? (
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Inicio: {dateOnly(campaign.starts_at)}
                {campaign.ends_at ? ` · Fin: ${dateOnly(campaign.ends_at)}` : " · Sin fecha de fin"}
              </p>
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => void duplicate(campaign)}>
                  <Copy className="size-4" /> Duplicar
                </Button>
                {campaign.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setStatus(campaign, "paused")}
                  >
                    <Pause className="size-4" /> Pausar
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void setStatus(campaign, "active")}>
                    <Play className="size-4" /> Activar
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Megaphone className="size-8" />}
          title="Sin campañas"
          description="Crea una campaña y guárdala como borrador antes de publicarla."
        />
      )}
    </>
  );
}
