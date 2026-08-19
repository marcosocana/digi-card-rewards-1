import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Gift, Receipt, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSession, fetchSessionInfo, sessionQueryKey } from "@/lib/session";
import { dateTime, eur, num, txnLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: sessionQueryKey,
      queryFn: fetchSessionInfo,
    });
    if (session?.org?.role === "staff") throw redirect({ to: "/panel/caja" });
  },
  component: ResumenPage,
});

const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

function ResumenPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ["overview", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const from = since(30);
      const [members, newMembers, txns, locations] = await Promise.all([
        supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!),
        supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .gte("joined_at", from),
        supabase
          .from("point_transactions")
          .select("id, type, points_delta, amount_cents, created_at, membership_id, location_id")
          .eq("organization_id", orgId!)
          .gte("created_at", from)
          .order("created_at", { ascending: false })
          .limit(400),
        supabase.from("locations").select("id, name").eq("organization_id", orgId!),
      ]);
      const rows = txns.data ?? [];
      const purchases = rows.filter((r) => r.type === "purchase");
      const locName = new Map((locations.data ?? []).map((l) => [l.id, l.name]));
      return {
        members: members.count ?? 0,
        newMembers: newMembers.count ?? 0,
        pointsIssued: rows
          .filter((r) => r.points_delta > 0)
          .reduce((s, r) => s + r.points_delta, 0),
        pointsRedeemed: rows
          .filter((r) => r.type === "redemption")
          .reduce((s, r) => s + Math.abs(r.points_delta), 0),
        redemptions: rows.filter((r) => r.type === "redemption").length,
        sales: rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0),
        purchases: purchases.length,
        averageTicket: purchases.length
          ? Math.round(purchases.reduce((s, r) => s + (r.amount_cents ?? 0), 0) / purchases.length)
          : 0,
        recent: rows
          .slice(0, 12)
          .map((r) => ({ ...r, locationName: locName.get(r.location_id ?? "") ?? "—" })),
      };
    },
  });

  if (!session?.org) {
    return (
      <EmptyState
        title="Aún no perteneces a ninguna organización"
        description="Pide una invitación al administrador de tu empresa para acceder al panel."
      />
    );
  }

  return (
    <>
      <PageHeader title="Resumen" description={`Últimos 30 días · ${session.organizationName}`} />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Miembros"
              value={num(data?.members)}
              hint={`+${num(data?.newMembers)} nuevos`}
              icon={<Users className="size-4" />}
            />
            <MetricCard
              label="Puntos emitidos"
              value={num(data?.pointsIssued)}
              icon={<Coins className="size-4" />}
            />
            <MetricCard
              label="Puntos canjeados"
              value={num(data?.pointsRedeemed)}
              hint={`${num(data?.redemptions)} canjes`}
              icon={<Gift className="size-4" />}
            />
            <MetricCard
              label="Ventas asociadas"
              value={eur(data?.sales)}
              icon={<TrendingUp className="size-4" />}
            />
            <MetricCard
              label="Compras registradas"
              value={num(data?.purchases)}
              icon={<Receipt className="size-4" />}
            />
            <MetricCard
              label="Ticket medio"
              value={eur(data?.averageTicket)}
              icon={<Receipt className="size-4" />}
            />
          </div>

          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-display text-lg font-semibold">Actividad reciente</h2>
              <Link
                to="/panel/clientes"
                className="text-sm text-primary underline-offset-2 hover:underline"
              >
                Ver clientes
              </Link>
            </div>
            {data?.recent.length ? (
              <ul className="divide-y">
                {data.recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{txnLabel[t.type] ?? t.type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.locationName} · {dateTime(t.created_at)}
                        {t.amount_cents ? ` · ${eur(t.amount_cents)}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={t.points_delta >= 0 ? "secondary" : "outline"}
                      className="shrink-0 font-mono"
                    >
                      {t.points_delta >= 0 ? "+" : ""}
                      {num(t.points_delta)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Todavía no hay movimientos.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
