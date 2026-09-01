import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScope } from "@/lib/session";
import { num } from "@/lib/format";
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
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{
    column: "name" | "email" | "location" | "points";
    ascending: boolean;
  }>({ column: "name", ascending: true });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    organizationId: orgId ?? "",
    locationId: selectedLocationIds.length === 1 ? (selectedLocationIds[0] ?? "") : "",
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
  const listLocations = (session?.locations ?? []).filter(
    (location) =>
      (!orgId || location.organizationId === orgId) &&
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

  const pageSize = 50;
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "memberships",
      orgId,
      isSuperadmin,
      [...selectedLocationIds].sort().join(","),
      term,
      locationFilter,
      page,
      sort.column,
      sort.ascending,
    ],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let query = supabase
        .from("memberships")
        .select(
          "id, public_id, cached_points_balance, status, acquisition_location_id, customers!inner(first_name, last_name, email), organizations(display_name), locations(name)",
          { count: "exact" },
        )
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (orgId) query = query.eq("organization_id", orgId);
      if (selectedLocationIds.length) {
        query = query.in("acquisition_location_id", selectedLocationIds);
      }
      if (locationFilter !== "all") {
        query = query.eq("acquisition_location_id", locationFilter);
      }
      const cleanTerm = term.trim().replace(/[,%()]/g, " ");
      if (cleanTerm) {
        query = query.or(
          `first_name.ilike.%${cleanTerm}%,last_name.ilike.%${cleanTerm}%,email.ilike.%${cleanTerm}%`,
          { referencedTable: "customers" },
        );
      }
      if (sort.column === "name") {
        query = query
          .order("first_name", { ascending: sort.ascending, referencedTable: "customers" })
          .order("last_name", { ascending: sort.ascending, referencedTable: "customers" });
      } else if (sort.column === "email") {
        query = query.order("email", {
          ascending: sort.ascending,
          referencedTable: "customers",
        });
      } else if (sort.column === "location") {
        query = query.order("name", {
          ascending: sort.ascending,
          referencedTable: "locations",
        });
      } else {
        query = query.order("cached_points_balance", { ascending: sort.ascending });
      }
      query = query.order("id", { ascending: true });
      const { data: rows, error, count } = await query;
      if (error) throw error;
      return { rows: rows ?? [], count: count ?? 0 };
    },
  });

  useEffect(() => {
    setPage(0);
  }, [term, locationFilter, sort.column, sort.ascending]);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));
  useEffect(() => {
    if (page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);
  const toggleSort = (column: typeof sort.column) => {
    setSort((current) => ({
      column,
      ascending: current.column === column ? !current.ascending : true,
    }));
  };

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
      _marketing: form.marketing,
      ...(form.lastName.trim() ? { _last_name: form.lastName.trim() } : {}),
      ...(form.phone.trim() ? { _phone: form.phone.trim() } : {}),
      ...(form.birthDate ? { _birth_date: form.birthDate } : {}),
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo dar de alta", { description: error.message });
      return;
    }
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
      locationId: selectedLocationIds.length === 1 ? (selectedLocationIds[0] ?? "") : "",
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
                  setForm((current) => ({
                    ...current,
                    locationId: scopedLocations[0]?.id ?? "",
                  }));
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

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_240px]">
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
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger aria-label="Filtrar por establecimiento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los establecimientos</SelectItem>
            {listLocations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.rows.length ? (
        <EmptyState
          icon={<Users className="size-8" />}
          title="Sin clientes todavía"
          description="Comparte el QR de captación de tus establecimientos para empezar a sumar miembros."
        />
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full table-fixed border-collapse">
            <thead className="border-b bg-secondary/60">
              <tr>
                {(
                  [
                    ["name", "Nombre", "w-[27%]"],
                    ["email", "Mail", "w-[32%]"],
                    ["location", "Establecimiento", "w-[27%]"],
                    ["points", "Puntos", "w-[14%] text-right"],
                  ] as const
                ).map(([column, label, className]) => (
                  <th key={column} scope="col" className={`px-2 py-3 sm:px-4 ${className}`}>
                    <button
                      type="button"
                      className={`inline-flex max-w-full items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground sm:text-xs ${column === "points" ? "justify-end" : ""}`}
                      onClick={() => toggleSort(column)}
                    >
                      <span className="truncate">{label}</span>
                      <ArrowUpDown aria-hidden className="size-3 shrink-0" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rows.map((membership) => {
                const customer = membership.customers as {
                  first_name: string;
                  last_name: string | null;
                  email: string;
                } | null;
                const detailLink = {
                  to: "/panel/clientes/$membershipId" as const,
                  params: { membershipId: membership.id },
                };
                return (
                  <tr key={membership.id} className="transition-colors hover:bg-secondary/60">
                    <td className="px-2 py-3 sm:px-4">
                      <Link
                        {...detailLink}
                        className="block truncate text-xs font-medium sm:text-sm"
                      >
                        {`${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() ||
                          "Sin nombre"}
                      </Link>
                      {isSuperadmin ? (
                        <span className="block truncate text-[10px] text-muted-foreground sm:text-xs">
                          {(membership.organizations as { display_name: string } | null)
                            ?.display_name ?? "Sin empresa"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 sm:px-4">
                      <Link
                        {...detailLink}
                        className="block truncate text-[11px] text-muted-foreground sm:text-sm"
                      >
                        {customer?.email ?? "—"}
                      </Link>
                    </td>
                    <td className="px-2 py-3 sm:px-4">
                      <span className="block truncate text-[11px] sm:text-sm">
                        {(membership.locations as { name: string } | null)?.name ?? "Sin asignar"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-xs font-semibold sm:px-4 sm:text-sm">
                      {num(membership.cached_points_balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
            <p className="text-xs text-muted-foreground">
              {data.count
                ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, data.count)} de ${data.count}`
                : "0 clientes"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft aria-hidden className="size-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="min-w-16 text-center text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
