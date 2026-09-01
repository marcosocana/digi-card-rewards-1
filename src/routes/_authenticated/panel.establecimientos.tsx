import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanUpgradeDialog } from "@/components/app/plan-upgrade-dialog";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sessionQueryKey, useAdminScope, useSession, type SessionInfo } from "@/lib/session";
import { getSubscriptionPlan } from "@/lib/subscription-plans";

export const Route = createFileRoute("/_authenticated/panel/establecimientos")({
  component: EstablecimientosPage,
});

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function EstablecimientosPage() {
  const queryClient = useQueryClient();
  const { refetch: refetchSession } = useSession();
  const {
    session,
    organizationId: orgId,
    isSuperadmin,
    isGlobal,
    selectedLocationIds,
    canMutate,
  } = useAdminScope();
  const planLimit = isSuperadmin
    ? null
    : (getSubscriptionPlan(session?.planCode)?.maxLocations ?? null);
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address_line: "", city: "", postal_code: "" });
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    address_line: string;
    city: string;
    postal_code: string;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["locations", orgId, isSuperadmin, [...selectedLocationIds].sort().join(",")],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let query = supabase
        .from("locations")
        .select(
          "id, name, slug, address_line, city, postal_code, status, organizations(display_name)",
        )
        .is("archived_at", null)
        .order("name");
      if (orgId) query = query.eq("organization_id", orgId);
      if (selectedLocationIds.length) query = query.in("id", selectedLocationIds);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const planLimitReached = planLimit !== null && (data?.length ?? 0) >= planLimit;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("plan") !== "updated") return;
    let attempts = 0;
    const checkPlan = async () => {
      attempts += 1;
      const { data: refreshedSession } = await refetchSession();
      if (refreshedSession?.planCode !== session?.planCode || attempts >= 8) {
        window.clearInterval(timer);
        window.history.replaceState({}, "", "/panel/establecimientos");
        if (refreshedSession?.planCode !== session?.planCode) {
          toast.success("Plan actualizado");
        }
      }
    };
    const timer = window.setInterval(() => void checkPlan(), 1_500);
    void checkPlan();
    return () => window.clearInterval(timer);
  }, [refetchSession, session?.planCode]);

  const create = async () => {
    if (!orgId || form.name.trim().length < 2) {
      toast.error("Indica un nombre válido");
      return;
    }
    const locationSlug = `${slugify(form.name) || "establecimiento"}-${crypto.randomUUID().slice(0, 6)}`;
    const { data: created, error } = await supabase
      .from("locations")
      .insert({
        organization_id: orgId,
        name: form.name.trim(),
        slug: locationSlug,
        address_line: form.address_line || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        status: "active",
      })
      .select("id,name,slug")
      .maybeSingle();
    if (error) {
      toast.error("No se pudo crear", { description: error.message });
      return;
    }
    if (created) {
      const { data: program, error: programError } = await supabase
        .from("loyalty_programs")
        .insert({
          organization_id: orgId,
          internal_name: `Programa · ${form.name.trim()}`,
          public_name: form.name.trim(),
          status: "active",
        })
        .select("id")
        .single();
      if (programError) {
        toast.warning("Establecimiento creado sin programa", {
          description: programError.message,
        });
      } else {
        await supabase
          .from("program_locations")
          .insert({ program_id: program.id, location_id: created.id });
      }
    }
    toast.success("Establecimiento creado");
    setOpen(false);
    setForm({ name: "", address_line: "", city: "", postal_code: "" });
    await refetch();
    const organizationName = session?.organizations.find(
      (organization) => organization.id === orgId,
    )?.name;
    if (created) {
      queryClient.setQueryData<SessionInfo | null>(sessionQueryKey, (current) =>
        current
          ? {
              ...current,
              locations: current.locations.some((location) => location.id === created.id)
                ? current.locations
                : [
                    ...current.locations,
                    {
                      id: created.id,
                      name: created.name,
                      slug: created.slug,
                      organizationId: orgId,
                      organizationName,
                    },
                  ].sort((a, b) => a.name.localeCompare(b.name, "es")),
            }
          : current,
      );
    }
  };

  const updateLocation = async () => {
    if (!editing || editing.name.trim().length < 2) {
      toast.error("Indica un nombre válido");
      return;
    }
    const { error } = await supabase
      .from("locations")
      .update({
        name: editing.name.trim(),
        address_line: editing.address_line || null,
        city: editing.city || null,
        postal_code: editing.postal_code || null,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error("No se pudo actualizar", { description: error.message });
      return;
    }
    toast.success("Establecimiento actualizado");
    setEditing(null);
    void refetch();
  };

  return (
    <>
      <PageHeader
        title="Establecimientos"
        description="Cada local tiene su propio QR de captación y su equipo asignado."
        actions={
          <>
            <Button
              type="button"
              disabled={!canMutate}
              onClick={() => (planLimitReached ? setUpgradeOpen(true) : setOpen(true))}
            >
              <Plus aria-hidden className="size-4" /> Nuevo establecimiento
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo establecimiento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {(
                    [
                      ["name", "Nombre"],
                      ["address_line", "Dirección"],
                      ["city", "Ciudad"],
                      ["postal_code", "Código postal"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" onClick={() => void create()}>
                    Crear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {isGlobal ? <AdminScopeNotice action="crear un establecimiento para esa empresa" /> : null}

      {planLimit !== null ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {data?.length ?? 0} de {planLimit} establecimiento{planLimit === 1 ? "" : "s"} incluidos
          en tu plan.
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : data?.length ? (
        <div className="surface divide-y overflow-hidden">
          {data.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {isSuperadmin
                    ? `${(l.organizations as { display_name: string } | null)?.display_name ?? "Sin empresa"} · `
                    : ""}
                  {[l.address_line, l.postal_code, l.city].filter(Boolean).join(", ") ||
                    "Sin dirección"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={l.status === "active" ? "secondary" : "outline"}>{l.status}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${l.name}`}
                  onClick={() =>
                    setEditing({
                      id: l.id,
                      name: l.name,
                      address_line: l.address_line ?? "",
                      city: l.city ?? "",
                      postal_code: l.postal_code ?? "",
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title="Sin establecimientos"
          description="Crea el primero para empezar a operar."
        />
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar establecimiento</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              {(
                [
                  ["name", "Nombre"],
                  ["address_line", "Dirección"],
                  ["city", "Ciudad"],
                  ["postal_code", "Código postal"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`edit-${key}`}>{label}</Label>
                  <Input
                    id={`edit-${key}`}
                    value={editing[key]}
                    onChange={(event) => setEditing({ ...editing, [key]: event.target.value })}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => void updateLocation()}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanUpgradeDialog
        currentPlanCode={session?.planCode}
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </>
  );
}
