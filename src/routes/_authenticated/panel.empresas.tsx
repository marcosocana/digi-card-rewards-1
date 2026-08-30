import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchSessionInfo, sessionQueryKey, useAdminScope, type SessionInfo } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/panel/empresas")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: sessionQueryKey,
      queryFn: fetchSessionInfo,
    });
    if (!session?.isSuperadmin) throw redirect({ to: "/panel" });
  },
  component: EmpresasPage,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type CompanyForm = {
  displayName: string;
  legalName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  city: string;
  postalCode: string;
};
type LocationForm = {
  organizationId: string;
  name: string;
  addressLine: string;
  city: string;
  postalCode: string;
};
const emptyLocation: LocationForm = {
  organizationId: "",
  name: "",
  addressLine: "",
  city: "",
  postalCode: "",
};

function CompanyFields({
  value,
  onChange,
  prefix,
}: {
  value: CompanyForm;
  onChange: (value: CompanyForm) => void;
  prefix: string;
}) {
  const fields = [
    ["displayName", "Nombre comercial"],
    ["legalName", "Razón social"],
    ["contactEmail", "Email de contacto"],
    ["contactPhone", "Teléfono"],
    ["addressLine", "Dirección"],
    ["city", "Ciudad"],
    ["postalCode", "Código postal"],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, label]) => (
        <div
          key={key}
          className={
            key === "displayName" || key === "addressLine"
              ? "space-y-1.5 sm:col-span-2"
              : "space-y-1.5"
          }
        >
          <Label htmlFor={`${prefix}-${key}`}>
            {label}
            {key === "contactEmail" ? " *" : ""}
          </Label>
          <Input
            id={`${prefix}-${key}`}
            type={key === "contactEmail" ? "email" : key === "contactPhone" ? "tel" : "text"}
            required={key === "contactEmail"}
            value={value[key]}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function LocationFields({
  value,
  onChange,
  prefix,
}: {
  value: LocationForm;
  onChange: (value: LocationForm) => void;
  prefix: string;
}) {
  const fields = [
    ["name", "Nombre"],
    ["addressLine", "Dirección"],
    ["city", "Ciudad"],
    ["postalCode", "Código postal"],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([key, label]) => (
        <div
          key={key}
          className={
            key === "name" || key === "addressLine" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"
          }
        >
          <Label htmlFor={`${prefix}-${key}`}>{label}</Label>
          <Input
            id={`${prefix}-${key}`}
            value={value[key]}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function EmpresasPage() {
  const { session, isSuperadmin, scopeLevel } = useAdminScope();
  const queryClient = useQueryClient();
  const [editingCompany, setEditingCompany] = useState<(CompanyForm & { id: string }) | null>(null);
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocation);
  const [editingLocation, setEditingLocation] = useState<(LocationForm & { id: string }) | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "company" | "location";
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["superadmin-organizations"],
    enabled: Boolean(session?.isSuperadmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id,display_name,legal_name,contact_email,contact_phone,address_line,city,postal_code,status,locations(id,name,address_line,city,postal_code,status,archived_at),organization_users(id,status)",
        )
        .is("archived_at", null)
        .order("display_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const refreshAll = async () =>
    Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: sessionQueryKey })]);

  const updateCompany = async () => {
    if (!editingCompany || editingCompany.displayName.trim().length < 2)
      return toast.error("Indica un nombre válido");
    const { error } = await supabase
      .from("organizations")
      .update({
        display_name: editingCompany.displayName.trim(),
        legal_name: editingCompany.legalName.trim() || null,
        contact_email: editingCompany.contactEmail.trim().toLowerCase() || null,
        contact_phone: editingCompany.contactPhone.trim() || null,
        address_line: editingCompany.addressLine.trim() || null,
        city: editingCompany.city.trim() || null,
        postal_code: editingCompany.postalCode.trim() || null,
      })
      .eq("id", editingCompany.id);
    if (error) return toast.error("No se pudo actualizar", { description: error.message });
    toast.success("Empresa actualizada");
    setEditingCompany(null);
    await refreshAll();
  };

  const createLocation = async () => {
    if (!locationForm.organizationId || locationForm.name.trim().length < 2)
      return toast.error("Indica una empresa y un nombre válido");
    const { data: created, error } = await supabase
      .from("locations")
      .insert({
        organization_id: locationForm.organizationId,
        name: locationForm.name.trim(),
        slug: `${slugify(locationForm.name) || "establecimiento"}-${crypto.randomUUID().slice(0, 6)}`,
        address_line: locationForm.addressLine.trim() || null,
        city: locationForm.city.trim() || null,
        postal_code: locationForm.postalCode.trim() || null,
        status: "active",
      })
      .select("id,name,slug")
      .single();
    if (error)
      return toast.error("No se pudo crear el establecimiento", { description: error.message });
    const { data: program, error: programError } = await supabase
      .from("loyalty_programs")
      .insert({
        organization_id: locationForm.organizationId,
        internal_name: `Programa · ${locationForm.name.trim()}`,
        public_name: locationForm.name.trim(),
        status: "active",
      })
      .select("id")
      .single();
    if (!programError)
      await supabase
        .from("program_locations")
        .insert({ program_id: program.id, location_id: created.id });
    else
      toast.warning("Establecimiento creado sin programa", { description: programError.message });
    toast.success("Establecimiento creado");
    setLocationForm(emptyLocation);
    await refetch();
    const organizationName = data?.find(
      (organization) => organization.id === locationForm.organizationId,
    )?.display_name;
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
                    organizationId: locationForm.organizationId,
                    organizationName,
                  },
                ].sort((a, b) => a.name.localeCompare(b.name, "es")),
          }
        : current,
    );
  };

  const updateLocation = async () => {
    if (!editingLocation || editingLocation.name.trim().length < 2)
      return toast.error("Indica un nombre válido");
    const { error } = await supabase
      .from("locations")
      .update({
        name: editingLocation.name.trim(),
        address_line: editingLocation.addressLine.trim() || null,
        city: editingLocation.city.trim() || null,
        postal_code: editingLocation.postalCode.trim() || null,
      })
      .eq("id", editingLocation.id);
    if (error) return toast.error("No se pudo actualizar", { description: error.message });
    toast.success("Establecimiento actualizado");
    setEditingLocation(null);
    await refreshAll();
  };

  const archiveTarget = async () => {
    if (!deleteTarget) return;
    const archivedAt = new Date().toISOString();
    if (deleteTarget.kind === "company") {
      const { error: locationsError } = await supabase
        .from("locations")
        .update({ status: "archived", archived_at: archivedAt })
        .eq("organization_id", deleteTarget.id)
        .is("archived_at", null);
      if (locationsError)
        return toast.error("No se pudieron archivar sus establecimientos", {
          description: locationsError.message,
        });
    }
    const table = deleteTarget.kind === "company" ? "organizations" : "locations";
    const { error } = await supabase
      .from(table)
      .update({ status: "archived", archived_at: archivedAt })
      .eq("id", deleteTarget.id);
    if (error) return toast.error("No se pudo eliminar", { description: error.message });
    toast.success(
      deleteTarget.kind === "company" ? "Empresa eliminada" : "Establecimiento eliminado",
    );
    setDeleteTarget(null);
    await refreshAll();
  };

  if (!isSuperadmin || scopeLevel !== "global") return null;
  return (
    <>
      <PageHeader
        title="Empresas"
        description="Crea y administra empresas matriz y sus establecimientos."
        actions={
          <Button asChild>
            <a href="/onboardingmanual">
              <Plus className="size-4" /> Nueva empresa
            </a>
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-52 rounded-xl" />
      ) : data?.length ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {data.map((organization) => {
            const locations = organization.locations.filter(
              (location) => location.status === "active" && !location.archived_at,
            );
            const activeUsers = organization.organization_users.filter(
              (user) => user.status === "active",
            ).length;
            return (
              <article key={organization.id} className="surface min-w-0 overflow-hidden p-4 sm:p-5">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="break-words font-display text-lg font-semibold">
                        {organization.display_name}
                      </h2>
                      <Badge variant="secondary">{organization.status}</Badge>
                    </div>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {organization.legal_name || organization.contact_email || "Sin datos legales"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {locations.length} establecimiento{locations.length === 1 ? "" : "s"} ·{" "}
                      {activeUsers} usuario{activeUsers === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setLocationForm({ ...emptyLocation, organizationId: organization.id })
                      }
                    >
                      <Plus className="size-4" /> Establecimiento
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${organization.display_name}`}
                      onClick={() =>
                        setEditingCompany({
                          id: organization.id,
                          displayName: organization.display_name,
                          legalName: organization.legal_name ?? "",
                          contactEmail: organization.contact_email ?? "",
                          contactPhone: organization.contact_phone ?? "",
                          addressLine: organization.address_line ?? "",
                          city: organization.city ?? "",
                          postalCode: organization.postal_code ?? "",
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Eliminar ${organization.display_name}`}
                      onClick={() =>
                        setDeleteTarget({
                          kind: "company",
                          id: organization.id,
                          name: organization.display_name,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Establecimientos
                  </p>
                  {locations.length ? (
                    locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">{location.name}</p>
                          <p className="break-words text-xs text-muted-foreground">
                            {[location.address_line, location.postal_code, location.city]
                              .filter(Boolean)
                              .join(", ") || "Sin dirección"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Editar ${location.name}`}
                            onClick={() =>
                              setEditingLocation({
                                id: location.id,
                                organizationId: organization.id,
                                name: location.name,
                                addressLine: location.address_line ?? "",
                                city: location.city ?? "",
                                postalCode: location.postal_code ?? "",
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Eliminar ${location.name}`}
                            onClick={() =>
                              setDeleteTarget({
                                kind: "location",
                                id: location.id,
                                name: location.name,
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      Sin establecimientos
                    </p>
                  )}
                </div>
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

      <Dialog
        open={Boolean(editingCompany)}
        onOpenChange={(open) => !open && setEditingCompany(null)}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          {editingCompany ? (
            <CompanyFields
              value={editingCompany}
              onChange={(value) => setEditingCompany({ ...value, id: editingCompany.id })}
              prefix="edit-company"
            />
          ) : null}
          <DialogFooter>
            <Button onClick={() => void updateCompany()}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(locationForm.organizationId)}
        onOpenChange={(open) => !open && setLocationForm(emptyLocation)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo establecimiento</DialogTitle>
            <DialogDescription>Se creará con su propio programa de fidelización.</DialogDescription>
          </DialogHeader>
          <LocationFields value={locationForm} onChange={setLocationForm} prefix="location" />
          <DialogFooter>
            <Button type="button" onClick={() => void createLocation()}>
              <MapPin className="size-4" /> Crear establecimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingLocation)}
        onOpenChange={(open) => !open && setEditingLocation(null)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar establecimiento</DialogTitle>
          </DialogHeader>
          {editingLocation ? (
            <LocationFields
              value={editingLocation}
              onChange={(value) => setEditingLocation({ ...value, id: editingLocation.id })}
              prefix="edit-location"
            />
          ) : null}
          <DialogFooter>
            <Button onClick={() => void updateLocation()}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar {deleteTarget?.kind === "company" ? "empresa" : "establecimiento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "company"
                ? `Se archivará “${deleteTarget.name}” y dejará de aparecer en los selectores. Sus datos históricos se conservarán.`
                : `Se archivará “${deleteTarget?.name}” y dejará de estar disponible. Sus datos históricos se conservarán.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void archiveTarget()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
