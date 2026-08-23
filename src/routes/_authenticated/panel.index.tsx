import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Coins, Gift, Lightbulb, Receipt, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSessionInfo,
  getSelectedLocationIds,
  locationFilterEvent,
  sessionQueryKey,
  useSession,
} from "@/lib/session";
import { dateTime, eur, num, txnLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

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

type PeriodPreset = "today" | "yesterday" | "last_week" | "last_month" | "current_year" | "custom";

const getPresetRange = (preset: Exclude<PeriodPreset, "custom">) => {
  const now = new Date();
  if (preset === "today") return { from: localDate(now), to: localDate(now) };
  if (preset === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return { from: localDate(yesterday), to: localDate(yesterday) };
  }
  if (preset === "last_week") {
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(currentMonday.getDate() - 7);
    const previousSunday = new Date(previousMonday);
    previousSunday.setDate(previousMonday.getDate() + 6);
    return { from: localDate(previousMonday), to: localDate(previousSunday) };
  }
  if (preset === "last_month") {
    return {
      from: localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: localDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  return { from: localDate(new Date(now.getFullYear(), 0, 1)), to: localDate(now) };
};

function ResumenPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const orgId = session?.org?.organization_id;
  const today = localDate();
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  useEffect(() => {
    setSelectedLocations(getSelectedLocationIds());
    const update = (event: Event) => {
      const locations = (event as CustomEvent<string[]>).detail;
      setSelectedLocations(locations);
    };
    window.addEventListener(locationFilterEvent, update);
    return () => window.removeEventListener(locationFilterEvent, update);
  }, []);

  const {
    data,
    isLoading,
    error: overviewError,
  } = useQuery({
    queryKey: [
      "overview",
      orgId,
      period,
      fromDate,
      toDate,
      [...selectedLocations].sort().join(","),
    ],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const from = new Date(`${fromDate}T00:00:00`).toISOString();
      const to = new Date(`${toDate}T23:59:59.999`).toISOString();
      let membersQuery = supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .lte("joined_at", to);
      let newMembersQuery = supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId!)
        .gte("joined_at", from)
        .lte("joined_at", to);

      if (selectedLocations.length) {
        membersQuery = membersQuery.in("acquisition_location_id", selectedLocations);
        newMembersQuery = newMembersQuery.in("acquisition_location_id", selectedLocations);
      }

      const fetchTransactions = async () => {
        const pageSize = 1_000;
        const allRows: Array<{
          id: string;
          type: string;
          points_delta: number;
          amount_cents: number | null;
          created_at: string;
          membership_id: string;
          location_id: string | null;
        }> = [];

        for (let page = 0; ; page += 1) {
          let query = supabase
            .from("point_transactions")
            .select("id, type, points_delta, amount_cents, created_at, membership_id, location_id")
            .eq("organization_id", orgId!)
            .gte("created_at", from)
            .lte("created_at", to)
            .order("created_at", { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);
          if (selectedLocations.length) query = query.in("location_id", selectedLocations);

          const response = await query;
          if (response.error) throw response.error;
          allRows.push(...(response.data ?? []));
          if ((response.data?.length ?? 0) < pageSize) break;
        }
        return allRows;
      };

      const [members, newMembers, rows, locations] = await Promise.all([
        membersQuery,
        newMembersQuery,
        fetchTransactions(),
        supabase.from("locations").select("id, name").eq("organization_id", orgId!).order("name"),
      ]);
      if (members.error) throw members.error;
      if (newMembers.error) throw newMembers.error;
      if (locations.error) throw locations.error;
      const purchases = rows.filter((r) => r.type === "purchase");
      const locName = new Map((locations.data ?? []).map((l) => [l.id, l.name]));
      const locationRows = (locations.data ?? [])
        .filter((location) => !selectedLocations.length || selectedLocations.includes(location.id))
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
        sales: purchases.reduce((s, r) => s + (r.amount_cents ?? 0), 0),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-52">
          <Select
            value={period}
            onValueChange={(value: PeriodPreset) => {
              setPeriod(value);
              if (value !== "custom") {
                const range = getPresetRange(value);
                setFromDate(range.from);
                setToDate(range.to);
              }
            }}
          >
            <SelectTrigger aria-label={t("Seleccionar periodo")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("Hoy")}</SelectItem>
              <SelectItem value="yesterday">{t("Ayer")}</SelectItem>
              <SelectItem value="last_week">{t("Semana pasada")}</SelectItem>
              <SelectItem value="last_month">{t("Mes pasado")}</SelectItem>
              <SelectItem value="current_year">{t("Año actual")}</SelectItem>
              <SelectItem value="custom">{t("Rango personalizado")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="from-date" className="text-xs">
                {t("Desde")}
              </Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => {
                  const next = event.target.value;
                  setFromDate(next);
                  if (next > toDate) setToDate(next);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to-date" className="text-xs">
                {t("Hasta")}
              </Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(event) => {
                  const next = event.target.value;
                  setToDate(next);
                  if (next < fromDate) setFromDate(next);
                }}
              />
            </div>
          </>
        ) : null}
      </div>

      {overviewError ? (
        <div className="surface border-destructive/30 p-5 text-sm text-destructive">
          <p className="font-semibold">{t("No se pudieron cargar los indicadores")}</p>
          <p className="mt-1 text-xs opacity-80">{overviewError.message}</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            <MetricCard
              label="Clientes"
              value={num(data?.members)}
              hint={t("+{count} nuevos", { count: num(data?.newMembers) })}
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
              hint={t("{count} canjes", { count: num(data?.redemptions) })}
              icon={<Gift className="size-4" />}
              to="/panel/recompensas"
            />
            <MetricCard
              label="Ventas asociadas"
              value={eur(data?.sales)}
              icon={<TrendingUp className="size-4" />}
              className="bg-[#f4efff] dark:bg-card"
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

          <div className="flex items-start gap-3 rounded-2xl bg-[#d9f4ff] p-5 sm:p-6 dark:border dark:bg-card">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-primary dark:bg-muted">
              <Lightbulb className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{t("Oportunidad del mes")}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                {t(
                  "Has registrado {members} nuevas altas y {redemptions} canjes en el periodo seleccionado. Revisa los clientes próximos a recompensa para impulsar su próxima visita.",
                  {
                    members: num(data?.newMembers),
                    redemptions: num(data?.redemptions),
                  },
                )}
              </p>
              <Link
                to="/panel/notificaciones"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
              >
                {t("Enviar mensaje de retorno")} <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="font-display text-lg font-semibold">{t("Actividad reciente")}</h2>
                <Link
                  to="/panel/clientes"
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  {t("Ver clientes")}
                </Link>
              </div>
              {data?.recent.length ? (
                <ul className="divide-y">
                  {data.recent.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {t(txnLabel[transaction.type] ?? transaction.type)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.locationName} · {dateTime(transaction.created_at)}
                          {transaction.amount_cents ? ` · ${eur(transaction.amount_cents)}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={transaction.points_delta >= 0 ? "secondary" : "outline"}
                        className="shrink-0 font-mono"
                      >
                        {transaction.points_delta >= 0 ? "+" : ""}
                        {num(transaction.points_delta)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {t("Todavía no hay movimientos.")}
                </p>
              )}
            </div>
            <aside className="surface overflow-hidden">
              <div className="border-b px-5 py-4">
                <h2 className="font-display text-lg font-bold">{t("Por establecimiento")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Ventas asociadas · periodo seleccionado")}
                </p>
              </div>
              {data?.locationRows.length ? (
                <div
                  className="h-[280px] px-2 pb-3 pt-5 sm:px-4"
                  role="img"
                  aria-label={t("Gráfica de ventas asociadas por establecimiento")}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.locationRows}
                      layout="vertical"
                      margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.35} />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => eur(Number(value))}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={88}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: string) =>
                          value.length > 13 ? `${value.slice(0, 12)}…` : value
                        }
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                        formatter={(value) => [eur(Number(value)), t("Ventas asociadas")]}
                        labelFormatter={(label) => String(label)}
                        contentStyle={{
                          borderRadius: "0.75rem",
                          borderColor: "var(--border)",
                          background: "var(--background)",
                          fontSize: "0.75rem",
                        }}
                      />
                      <Bar dataKey="sales" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {t("Todavía no hay ventas asociadas.")}
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </>
  );
}
