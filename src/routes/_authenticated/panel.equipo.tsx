import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, ChevronDown, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/session";
import { roleLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export const Route = createFileRoute("/_authenticated/panel/equipo")({
  component: EquipoPage,
});

function EquipoPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "staff",
    location_ids: [] as string[],
  });
  const [editing, setEditing] = useState<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    location_ids: string[];
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["team", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_users")
        .select(
          "id, full_name, invited_email, role, status, user_id, can_adjust_points, user_location_assignments(location_id)",
        )
        .eq("organization_id", orgId!)
        .order("role");
      if (error) throw error;
      return data;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["team-locations", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("organization_id", orgId!)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invite = async () => {
    if (!orgId || !form.email.includes("@")) {
      toast.error(t("Introduce un email válido"));
      return;
    }
    if (form.role !== "admin" && !form.location_ids.length) {
      toast.error(t("Asigna al menos un establecimiento"));
      return;
    }
    const { data: invited, error } = await supabase
      .from("organization_users")
      .insert({
        organization_id: orgId,
        invited_email: form.email.trim().toLowerCase(),
        full_name: form.full_name.trim() || null,
        role: form.role as "staff",
        can_adjust_points: form.role === "manager",
        status: "active",
      })
      .select("id")
      .single();
    if (error) {
      toast.error(t("No se pudo invitar"), { description: error.message });
      return;
    }
    if (form.role !== "admin" && form.location_ids.length && invited) {
      const { error: assignmentError } = await supabase.from("user_location_assignments").insert(
        form.location_ids.map((locationId) => ({
          organization_user_id: invited.id,
          location_id: locationId,
        })),
      );
      if (assignmentError) {
        toast.error(t("Usuario creado, pero no se pudo asignar el establecimiento"), {
          description: assignmentError.message,
        });
        return;
      }
    }
    try {
      if (invited) {
        await sendTransactionalEmail({ kind: "team_invitation", invitationId: invited.id });
      }
    } catch (emailError) {
      toast.warning(t("Invitación guardada, pero el email no pudo enviarse"), {
        description: emailError instanceof Error ? emailError.message : undefined,
      });
      setOpen(false);
      setForm({ email: "", full_name: "", role: "staff", location_ids: [] });
      void refetch();
      return;
    }
    toast.success(t("Invitación creada"), {
      description: t("Hemos enviado un email para que cree su cuenta."),
    });
    setOpen(false);
    setForm({ email: "", full_name: "", role: "staff", location_ids: [] });
    void refetch();
  };

  const updateMember = async () => {
    if (!editing || !editing.email.includes("@"))
      return toast.error(t("Introduce un email válido"));
    if (editing.role !== "admin" && !editing.location_ids.length)
      return toast.error(t("Asigna al menos un establecimiento"));
    const { error } = await supabase
      .from("organization_users")
      .update({
        invited_email: editing.email.trim().toLowerCase(),
        full_name: editing.full_name.trim() || null,
        role: editing.role as "staff",
        can_adjust_points: editing.role === "manager",
      })
      .eq("id", editing.id);
    if (error) return toast.error(t("No se pudo actualizar"), { description: error.message });
    const { error: clearError } = await supabase
      .from("user_location_assignments")
      .delete()
      .eq("organization_user_id", editing.id);
    if (clearError)
      return toast.error(t("No se pudieron actualizar los establecimientos"), {
        description: clearError.message,
      });
    if (editing.role !== "admin") {
      const { error: assignmentError } = await supabase.from("user_location_assignments").insert(
        editing.location_ids.map((locationId) => ({
          organization_user_id: editing.id,
          location_id: locationId,
        })),
      );
      if (assignmentError)
        return toast.error(t("No se pudo asignar el establecimiento"), {
          description: assignmentError.message,
        });
    }
    toast.success(t("Perfil del equipo actualizado"));
    setEditing(null);
    void refetch();
  };

  const locationPicker = (selected: string[], onChange: (ids: string[]) => void) => {
    const allIds = (locations ?? []).map((location) => location.id);
    const allSelected = allIds.length > 0 && selected.length === allIds.length;
    const label = allSelected
      ? t("Todos los establecimientos")
      : selected.length === 1
        ? (locations?.find((location) => location.id === selected[0])?.name ??
          t("1 establecimiento"))
        : selected.length > 1
          ? t("{count} establecimientos", { count: selected.length })
          : t("Selecciona establecimientos");

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{label}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => onChange(allSelected ? [] : allIds)}
          >
            {t("Todos los establecimientos")}
          </DropdownMenuCheckboxItem>
          {(locations ?? []).map((location) => (
            <DropdownMenuCheckboxItem
              key={location.id}
              checked={selected.includes(location.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() =>
                onChange(
                  selected.includes(location.id)
                    ? selected.filter((id) => id !== location.id)
                    : [...selected, location.id],
                )
              }
            >
              {location.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Roles y permisos de acceso al panel."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus aria-hidden className="size-4" /> {t("Invitar")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("Invitar a una persona")}</DialogTitle>
                <DialogDescription>
                  {t("Recibirá el rol al crear su cuenta con este email.")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="iemail">Email</Label>
                  <Input
                    id="iemail"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                {form.role !== "admin" ? (
                  <div className="space-y-1.5">
                    <Label>{t("Establecimientos asignados")}</Label>
                    {locationPicker(form.location_ids, (location_ids) =>
                      setForm({ ...form, location_ids }),
                    )}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="iname">{t("Nombre")}</Label>
                  <Input
                    id="iname"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Rol")}</Label>
                  <Select
                    value={form.role}
                    onValueChange={(role) =>
                      setForm({
                        ...form,
                        role,
                        location_ids: role === "admin" ? [] : form.location_ids,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">{t("Empleado")}</SelectItem>
                      <SelectItem value="manager">{t("Responsable")}</SelectItem>
                      <SelectItem value="admin">{t("Administrador")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void invite()}>{t("Enviar invitación")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="surface divide-y overflow-hidden">
          {(data ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{u.full_name ?? u.invited_email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.invited_email} · {t(u.user_id ? "cuenta activa" : "pendiente de registro")}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {u.role === "admin"
                    ? t("Todos los establecimientos")
                    : u.user_location_assignments?.length === (locations ?? []).length &&
                        (locations ?? []).length > 0
                      ? t("Todos los establecimientos")
                      : u.user_location_assignments?.length
                        ? u.user_location_assignments
                            .map(
                              (assignment) =>
                                locations?.find(
                                  (location) => location.id === assignment.location_id,
                                )?.name,
                            )
                            .filter(Boolean)
                            .join(", ")
                        : t("Sin establecimientos")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t(roleLabel[u.role] ?? u.role)}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("Editar {name}", { name: u.full_name ?? u.invited_email ?? "" })}
                  onClick={() =>
                    setEditing({
                      id: u.id,
                      email: u.invited_email ?? "",
                      full_name: u.full_name ?? "",
                      role: u.role,
                      location_ids:
                        u.user_location_assignments?.map((assignment) => assignment.location_id) ??
                        [],
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Editar perfil del equipo")}</DialogTitle>
            <DialogDescription>
              {t("Actualiza sus datos, rol y establecimientos asignados.")}
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-team-name">{t("Nombre")}</Label>
                <Input
                  id="edit-team-name"
                  value={editing.full_name}
                  onChange={(event) => setEditing({ ...editing, full_name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-team-email">Email</Label>
                <Input
                  id="edit-team-email"
                  type="email"
                  value={editing.email}
                  onChange={(event) => setEditing({ ...editing, email: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Rol")}</Label>
                <Select
                  value={editing.role}
                  onValueChange={(role) =>
                    setEditing({
                      ...editing,
                      role,
                      location_ids: role === "admin" ? [] : editing.location_ids,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{t("Empleado")}</SelectItem>
                    <SelectItem value="manager">{t("Responsable")}</SelectItem>
                    <SelectItem value="admin">{t("Administrador")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing.role !== "admin" ? (
                <div className="space-y-1.5">
                  <Label>{t("Establecimientos asignados")}</Label>
                  {locationPicker(editing.location_ids, (location_ids) =>
                    setEditing({ ...editing, location_ids }),
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => void updateMember()}>{t("Guardar cambios")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
