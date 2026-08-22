import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Coins, Gift, Lightbulb, Receipt, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

function ResumenPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;
  const today = localDate();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ["overview", orgId, fromDate, toDate],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const from = new Date(`${fromDate}T00:00:00`).toISOString();
      const to = new Date(`${toDate}T23:59:59.999`).toISOString();
      const [members, newMembers, txns, locations] = await Promise.all([
        supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .lte("joined_at", to),
        supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .gte("joined_at", from)
          .lte("joined_at", to),
        supabase
          .from("point_transactions")
          .select("id, type, points_delta, amount_cents, created_at, membership_id, location_id")
          .eq("organization_id", orgId!)
          .gte("created_at", from)
          .lte("created_at", to)
          .order("created_at", { ascending: false })
          .limit(400),
        supabase.from("locations").select("id, name").eq("organization_id", orgId!),
      ]);
      const rows = txns.data ?? [];
      const purchases = rows.filter((r) => r.type === "purchase");
      const locName = new Map((locations.data ?? []).map((l) => [l.id, l.name]));
      const locationRows = (locations.data ?? [])
        .map((location) => {
          const locationPurchases = purchases.filter((row) => row.location_id === location.id);
          return {
            id: location.id,
            name: location.name,
            purchases: locationPurchases.length,
            sales: locationPurchases.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0),
          };
        })
        .sort((a, b) => b.sales - a.sales);
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
        locationRows,
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
      <PageHeader
        title={`Hola, ${(session.fullName ?? "equipo").split(" ")[0]}`}
        description={`${new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date())} · ${session.organizationName}`}
      />

      <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Periodo de los indicadores</p>
          <p className="text-xs text-muted-foreground">Selecciona un día o un rango de fechas.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="space-y-1">
            <Label htmlFor="from-date" className="text-xs">
              Desde
            </Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-date" className="text-xs">
              Hasta
            </Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
        </div>
      </div>

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
              label="Clientes"
              value={num(data?.members)}
              hint={`+${num(data?.newMembers)} nuevos`}
              icon={<Users className="size-4" />}
              className="border-pink-200/70"
              to="/panel/clientes"
            />
            <MetricCard
              label="Puntos emitidos"
              value={num(data?.pointsIssued)}
              icon={<Coins className="size-4" />}
              to="/panel/estadisticas"
            />
            <MetricCard
              label="Puntos canjeados"
              value={num(data?.pointsRedeemed)}
              hint={`${num(data?.redemptions)} canjes`}
              icon={<Gift className="size-4" />}
              to="/panel/recompensas"
            />
            <MetricCard
              label="Ventas asociadas"
              value={eur(data?.sales)}
              icon={<TrendingUp className="size-4" />}
              className="bg-[#f4efff]"
              to="/panel/estadisticas"
            />
            <MetricCard
              label="Compras registradas"
              value={num(data?.purchases)}
              icon={<Receipt className="size-4" />}
              to="/panel/actividad"
            />
            <MetricCard
              label="Ticket medio"
              value={eur(data?.averageTicket)}
              icon={<Receipt className="size-4" />}
              to="/panel/estadisticas"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#d9f4ff] p-5 sm:p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-primary">
              <Lightbulb className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Oportunidad del mes</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                Has registrado {num(data?.newMembers)} nuevas altas y {num(data?.redemptions)}{" "}
                canjes en el periodo seleccionado. Revisa los clientes próximos a recompensa para
                impulsar su próxima visita.
              </p>
              <Link
                to="/panel/notificaciones"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
              >
                Crear campaña de retorno <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.55fr_.45fr]">
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
            <aside className="surface overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="font-display text-lg font-bold">Por establecimiento</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ventas asociadas · periodo seleccionado
                </p>
              </div>
              <div className="divide-y">
                {data?.locationRows.map((location, index) => (
                  <div key={location.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{location.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {num(location.purchases)} compras
                        </p>
                      </div>
                      <span className="text-sm font-bold">{eur(location.sales)}</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(8, 100 - index * 15)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
