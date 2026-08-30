import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScope } from "@/lib/session";
import { dateOnly, num } from "@/lib/format";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/panel/clientes/")({
  component: ClientesPage,
});

function ClientesPage() {
  const {
    session,
    organizationId: orgId,
    isSuperadmin,
    isGlobal,
    selectedLocationIds,
  } = useAdminScope();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    organizationId: orgId ?? "",
    locationId: selectedLocationIds.length === 1 ? selectedLocationIds[0] : "",
    marketing: false,
  });

  const effectiveOrganizationId = isGlobal ? form.organizationId : orgId;
  const scopedLocations = (session?.locations ?? []).filter(
    (location) =>
      (!isGlobal || Boolean(effectiveOrganizationId)) &&
      (!isSuperadmin ||
        !effectiveOrganizationId ||
        location.organizationId === effectiveOrganizationId) &&
      (!selectedLocationIds.length || selectedLocationIds.includes(location.id)),
  );

  const { data: locationPrograms } = useQuery({
    queryKey: [
      "manual-customer-programs",
      effectiveOrganizationId,
      scopedLocations.map((item) => item.id).join(","),
    ],
    enabled: Boolean(effectiveOrganizationId && scopedLocations.length),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_locations")
        .select("location_id,program_id,loyalty_programs!inner(status)")
        .in(
          "location_id",
          scopedLocations.map((location) => location.id),
        )
        .eq("loyalty_programs.status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["memberships", orgId, isSuperadmin, [...selectedLocationIds].sort().join(",")],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let query = supabase
        .from("memberships")
        .select(
          "id, public_id, cached_points_balance, status, joined_at, acquisition_location_id, acquisition_source_id, customers(first_name, last_name, email), organizations(display_name), locations(name)",
        )
        .order("joined_at", { ascending: false })
        .limit(500);
      if (orgId) query = query.eq("organization_id", orgId);
      if (selectedLocationIds.length) {
        query = query.in("acquisition_location_id", selectedLocationIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      const sourceIds = [
        ...new Set((data ?? []).map((item) => item.acquisition_source_id).filter(Boolean)),
      ] as string[];
      const { data: sources, error: sourcesError } = sourceIds.length
        ? await supabase.from("acquisition_sources").select("id,name").in("id", sourceIds)
        : { data: [], error: null };
      if (sourcesError) throw sourcesError;
      const sourceNames = new Map((sources ?? []).map((source) => [source.id, source.name]));
      return (data ?? []).map((item) => ({
        ...item,
        acquisition_source_name: item.acquisition_source_id
          ? (sourceNames.get(item.acquisition_source_id) ?? null)
          : null,
      }));
    },
  });

  const filtered = (data ?? []).filter((m) => {
    const c = m.customers as { first_name: string; last_name: string | null; email: string } | null;
    const hay = `${c?.first_name ?? ""} ${c?.last_name ?? ""} ${c?.email ?? ""}`.toLowerCase();
    return hay.includes(term.toLowerCase());
  });

  const createCustomer = async () => {
    const program = locationPrograms?.find((item) => item.location_id === form.locationId);
    if (
      !effectiveOrganizationId ||
      !program ||
      !form.email.includes("@") ||
      form.firstName.trim().length < 2
    ) {
      toast.error("Completa la empresa, el establecimiento, el nombre y el email");
      return;
    }
    setSaving(true);
    const { data: result, error } = await supabase.rpc("register_customer_manually", {
      _program_id: program.program_id,
      _location_id: form.locationId,
      _email: form.email.trim().toLowerCase(),
      _first_name: form.firstName.trim(),
      _last_name: form.lastName.trim() || undefined,
      _phone: form.phone.trim() || undefined,
      _birth_date: form.birthDate || undefined,
      _marketing: form.marketing,
    });
    setSaving(false);
    if (error) return toast.error("No se pudo dar de alta", { description: error.message });
    const response = result as { existing?: boolean } | null;
    toast.success(
      response?.existing ? "El cliente ya estaba dado de alta" : "Cliente dado de alta",
    );
    setOpen(false);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
      organizationId: isGlobal ? "" : (orgId ?? ""),
      locationId: selectedLocationIds.length === 1 ? selectedLocationIds[0] : "",
      marketing: false,
    });
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]);
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Miembros del programa y su saldo actual."
        actions={
          session ? (
            <Dialog
              open={open}
              onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (isOpen && scopedLocations.length === 1) {
                  setForm((current) => ({ ...current, locationId: scopedLocations[0].id }));
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type="button"
                  disabled={isGlobal ? !session.organizations.length : !scopedLocations.length}
                >
                  <Plus className="size-4" /> Nuevo cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dar de alta un cliente</DialogTitle>
                  <DialogDescription>
                    Quedará asociado a la empresa, al establecimiento y a su programa de
                    fidelización.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  {isGlobal ? (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Empresa</Label>
                      <Select
                        value={form.organizationId}
                        onValueChange={(organizationId) =>
                          setForm({ ...form, organizationId, locationId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {session.organizations.map((organization) => (
                            <SelectItem key={organization.id} value={organization.id}>
                              {organization.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-first-name">Nombre</Label>
                    <Input
                      id="customer-first-name"
                      value={form.firstName}
                      onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-last-name">Apellidos</Label>
                    <Input
                      id="customer-last-name"
                      value={form.lastName}
                      onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="customer-email">Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-phone">Teléfono</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customer-birth-date">Fecha de nacimiento</Label>
                    <Input
                      id="customer-birth-date"
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Establecimiento</Label>
                    <Select
                      value={form.locationId}
                      onValueChange={(locationId) => setForm({ ...form, locationId })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un establecimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        {scopedLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-start gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={form.marketing}
                      onChange={(event) => setForm({ ...form, marketing: event.target.checked })}
                    />
                    El cliente autoriza comunicaciones comerciales
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" disabled={saving} onClick={() => void createCustomer()}>
                    {saving ? "Guardando…" : "Dar de alta"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o email"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title="Sin clientes todavía"
          description="Comparte el QR de captación de tus establecimientos para empezar a sumar miembros."
        />
      ) : (
        <div className="surface divide-y overflow-hidden">
          {filtered.map((m) => {
            const c = m.customers as {
              first_name: string;
              last_name: string | null;
              email: string;
            } | null;
            return (
              <Link
                key={m.id}
                to="/panel/clientes/$membershipId"
                params={{ membershipId: m.id }}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-secondary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c?.first_name} {c?.last_name ?? ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c?.email} · alta {dateOnly(m.joined_at)}
                    {isSuperadmin
                      ? ` · ${(m.organizations as { display_name: string } | null)?.display_name ?? "Sin empresa"}`
                      : ""}
                    {` · ${(m.locations as { name: string } | null)?.name ?? "Sin establecimiento"}`}
                    {m.acquisition_source_name ? ` · vía ${m.acquisition_source_name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.status !== "active" ? <Badge variant="outline">{m.status}</Badge> : null}
                  <span className="font-mono text-sm font-semibold">
                    {num(m.cached_points_balance)} pts
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
