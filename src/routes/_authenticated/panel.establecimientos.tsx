import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/session";

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
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address_line: "", city: "", postal_code: "" });
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    address_line: string;
    city: string;
    postal_code: string;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["locations", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, slug, address_line, city, postal_code, status")
        .eq("organization_id", orgId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = async () => {
    if (!orgId || form.name.trim().length < 2) {
      toast.error("Indica un nombre válido");
      return;
    }
    const { data: created, error } = await supabase
      .from("locations")
      .insert({
        organization_id: orgId,
        name: form.name.trim(),
        slug: slugify(form.name),
        address_line: form.address_line || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        status: "active",
      })
      .select("id")
      .maybeSingle();
    if (error) {
      toast.error("No se pudo crear", { description: error.message });
      return;
    }
    const { data: program } = await supabase
      .from("loyalty_programs")
      .select("id")
      .eq("organization_id", orgId)
      .limit(1)
      .maybeSingle();
    if (program && created) {
      await supabase
        .from("program_locations")
        .insert({ program_id: program.id, location_id: created.id });
    }
    toast.success("Establecimiento creado");
    setOpen(false);
    setForm({ name: "", address_line: "", city: "", postal_code: "" });
    void refetch();
  };

  const updateLocation = async () => {
    if (!editing || editing.name.trim().length < 2) return toast.error("Indica un nombre válido");
    const { error } = await supabase
      .from("locations")
      .update({
        name: editing.name.trim(),
        address_line: editing.address_line || null,
        city: editing.city || null,
        postal_code: editing.postal_code || null,
      })
      .eq("id", editing.id);
    if (error) return toast.error("No se pudo actualizar", { description: error.message });
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus aria-hidden className="size-4" /> Nuevo establecimiento
              </Button>
            </DialogTrigger>
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
                <Button onClick={() => void create()}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : data?.length ? (
        <div className="surface divide-y overflow-hidden">
          {data.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">
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
    </>
  );
}
