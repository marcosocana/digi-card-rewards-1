import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sessionQueryKey, useAdminScope } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/panel/empresas")({
  component: EmpresasPage,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function EmpresasPage() {
  const { session, isSuperadmin, scopeLevel } = useAdminScope();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ displayName: "", legalName: "", contactEmail: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["superadmin-organizations"],
    enabled: Boolean(session?.isSuperadmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id,display_name,legal_name,contact_email,status,plan_code,subscription_status,created_at,locations(id,status),organization_users(id,status)",
        )
        .is("archived_at", null)
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    const displayName = form.displayName.trim();
    if (displayName.length < 2) return toast.error("Indica un nombre de empresa válido");
    const baseSlug = slugify(displayName) || "empresa";
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    const slug = existing ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;
    const { error } = await supabase.from("organizations").insert({
      display_name: displayName,
      legal_name: form.legalName.trim() || null,
      contact_email: form.contactEmail.trim().toLowerCase() || null,
      slug,
      status: "active",
    });
    if (error) return toast.error("No se pudo crear la empresa", { description: error.message });
    toast.success("Empresa creada", {
      description: "Ya puedes seleccionarla en el menú y añadir sus establecimientos.",
    });
    setOpen(false);
    setForm({ displayName: "", legalName: "", contactEmail: "" });
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: sessionQueryKey })]);
  };

  if (!isSuperadmin || scopeLevel !== "global") return null;

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Empresas matriz desde las que se organizan establecimientos, usuarios y configuración."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nueva empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva empresa matriz</DialogTitle>
                <DialogDescription>
                  Después podrás seleccionarla en el menú para crear sus establecimientos e invitar
                  usuarios.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company-name">Nombre comercial</Label>
                  <Input
                    id="company-name"
                    placeholder="Club - Café Norte"
                    value={form.displayName}
                    onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-legal-name">Razón social</Label>
                  <Input
                    id="company-legal-name"
                    value={form.legalName}
                    onChange={(event) => setForm({ ...form, legalName: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company-email">Email de contacto</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void create()}>Crear empresa</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <Skeleton className="h-52 rounded-xl" />
      ) : data?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((organization) => {
            const activeLocations = organization.locations.filter(
              (location) => location.status === "active",
            ).length;
            const activeUsers = organization.organization_users.filter(
              (user) => user.status === "active",
            ).length;
            return (
              <article key={organization.id} className="surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-semibold">
                      {organization.display_name}
                    </h2>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {organization.legal_name || organization.contact_email || "Sin datos legales"}
                    </p>
                  </div>
                  <Badge variant="secondary">{organization.status}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Establecimientos</p>
                    <p className="mt-1 text-lg font-semibold">{activeLocations}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Usuarios</p>
                    <p className="mt-1 text-lg font-semibold">{activeUsers}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Selecciona esta empresa en “Todos los locales” para administrarla.
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="size-8" />}
          title="Aún no hay empresas"
          description="Crea la primera empresa matriz para asociarle establecimientos y usuarios."
        />
      )}
    </>
  );
}
