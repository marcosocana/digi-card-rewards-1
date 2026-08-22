import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
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
import { useSession } from "@/lib/session";
import { roleLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/equipo")({
  component: EquipoPage,
});

function EquipoPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "staff", location_id: "" });
  const [editing, setEditing] = useState<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    location_id: string;
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
      toast.error("Introduce un email válido");
      return;
    }
    if (form.role !== "admin" && !form.location_id) {
      toast.error("Asigna un establecimiento");
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
      toast.error("No se pudo invitar", { description: error.message });
      return;
    }
    if (form.role !== "admin" && form.location_id && invited) {
      const { error: assignmentError } = await supabase
        .from("user_location_assignments")
        .insert({ organization_user_id: invited.id, location_id: form.location_id });
      if (assignmentError) {
        toast.error("Usuario creado, pero no se pudo asignar el establecimiento", {
          description: assignmentError.message,
        });
        return;
      }
    }
    toast.success("Invitación creada", {
      description: "Al registrarse con ese email heredará el rol.",
    });
    setOpen(false);
    setForm({ email: "", full_name: "", role: "staff", location_id: "" });
    void refetch();
  };

  const updateMember = async () => {
    if (!editing || !editing.email.includes("@")) return toast.error("Introduce un email válido");
    if (editing.role !== "admin" && !editing.location_id)
      return toast.error("Asigna un establecimiento");
    const { error } = await supabase
      .from("organization_users")
      .update({
        invited_email: editing.email.trim().toLowerCase(),
        full_name: editing.full_name.trim() || null,
        role: editing.role as "staff",
        can_adjust_points: editing.role === "manager",
      })
      .eq("id", editing.id);
    if (error) return toast.error("No se pudo actualizar", { description: error.message });
    const { error: clearError } = await supabase
      .from("user_location_assignments")
      .delete()
      .eq("organization_user_id", editing.id);
    if (clearError)
      return toast.error("No se pudieron actualizar los establecimientos", {
        description: clearError.message,
      });
    if (editing.role !== "admin") {
      const { error: assignmentError } = await supabase
        .from("user_location_assignments")
        .insert({ organization_user_id: editing.id, location_id: editing.location_id });
      if (assignmentError)
        return toast.error("No se pudo asignar el establecimiento", {
          description: assignmentError.message,
        });
    }
    toast.success("Perfil del equipo actualizado");
    setEditing(null);
    void refetch();
  };

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Roles y permisos de acceso al panel."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus aria-hidden className="size-4" /> Invitar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar a una persona</DialogTitle>
                <DialogDescription>
                  Recibirá el rol al crear su cuenta con este email.
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
                    <Label>Establecimiento asignado</Label>
                    <Select
                      value={form.location_id}
                      onValueChange={(v) => setForm({ ...form, location_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un establecimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        {(locations ?? []).map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="iname">Nombre</Label>
                  <Input
                    id="iname"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Empleado</SelectItem>
                      <SelectItem value="manager">Responsable</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => void invite()}>Enviar invitación</Button>
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
                  {u.invited_email} · {u.user_id ? "cuenta activa" : "pendiente de registro"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{roleLabel[u.role] ?? u.role}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Editar ${u.full_name ?? u.invited_email}`}
                  onClick={() =>
                    setEditing({
                      id: u.id,
                      email: u.invited_email ?? "",
                      full_name: u.full_name ?? "",
                      role: u.role,
                      location_id: u.user_location_assignments?.[0]?.location_id ?? "",
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
            <DialogTitle>Editar perfil del equipo</DialogTitle>
            <DialogDescription>
              Actualiza sus datos, rol y establecimiento asignado.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-team-name">Nombre</Label>
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
                <Label>Rol</Label>
                <Select
                  value={editing.role}
                  onValueChange={(role) =>
                    setEditing({
                      ...editing,
                      role,
                      location_id: role === "admin" ? "" : editing.location_id,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Empleado</SelectItem>
                    <SelectItem value="manager">Responsable</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing.role !== "admin" ? (
                <div className="space-y-1.5">
                  <Label>Establecimiento asignado</Label>
                  <Select
                    value={editing.location_id}
                    onValueChange={(location_id) => setEditing({ ...editing, location_id })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un establecimiento" />
                    </SelectTrigger>
                    <SelectContent>
                      {(locations ?? []).map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => void updateMember()}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
