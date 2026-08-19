import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { dateOnly, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/clientes/")({
  component: ClientesPage,
});

function ClientesPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const [term, setTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["memberships", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, public_id, cached_points_balance, status, joined_at, customers(first_name, last_name, email)")
        .eq("organization_id", orgId!)
        .order("joined_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((m) => {
    const c = m.customers as { first_name: string; last_name: string | null; email: string } | null;
    const hay = `${c?.first_name ?? ""} ${c?.last_name ?? ""} ${c?.email ?? ""}`.toLowerCase();
    return hay.includes(term.toLowerCase());
  });

  return (
    <>
      <PageHeader title="Clientes" description="Miembros del programa y su saldo actual." />

      <div className="relative">
        <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
            const c = m.customers as { first_name: string; last_name: string | null; email: string } | null;
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
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.status !== "active" ? <Badge variant="outline">{m.status}</Badge> : null}
                  <span className="font-mono text-sm font-semibold">{num(m.cached_points_balance)} pts</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
