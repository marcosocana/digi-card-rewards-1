import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSession } from "@/lib/session";
import { roleLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/equipo")({
  component: EquipoPage,
});

function EquipoPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "staff" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["team", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_users")
        .select("id, full_name, invited_email, role, status, user_id, can_adjust_points")
        .eq("organization_id", orgId!)
        .order("role");
      if (error) throw error;
      return data;
    },
  });

  const invite = async () => {
    if (!orgId || !form.email.includes("@")) {
      toast.error("Introduce un email válido");
      return;
    }
    const { error } = await supabase.from("organization_users").insert({
      organization_id: orgId,
      invited_email: form.email.trim().toLowerCase(),
      full_name: form.full_name.trim() || null,
      role: form.role as "staff",
      can_adjust_points: form.role !== "staff",
      status: "active",
    });
    if (error) {
      toast.error("No se pudo invitar", { description: error.message });
      return;
    }
    toast.success("Invitación creada", { description: "Al registrarse con ese email heredará el rol." });
    setOpen(false);
    setForm({ email: "", full_name: "", role: "staff" });
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
                <DialogDescription>Recibirá el rol al crear su cuenta con este email.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="iemail">Email</Label>
                  <Input id="iemail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iname">Nombre</Label>
                  <Input id="iname" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
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
              <Badge variant="secondary">{roleLabel[u.role] ?? u.role}</Badge>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
