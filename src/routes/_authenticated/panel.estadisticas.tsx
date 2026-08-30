import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAdminScope } from "@/lib/session";
import { eur, num } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLog } from "@/components/app/activity-log";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/panel/estadisticas")({
  component: EstadisticasPage,
});

function EstadisticasPage() {
  const { session, organizationId: orgId, isSuperadmin, selectedLocationIds } = useAdminScope();
  const [period, setPeriod] = useState("365");
  const { data, isLoading } = useQuery({
    queryKey: [
      "advanced-stats",
      orgId,
      isSuperadmin,
      period,
      [...selectedLocationIds].sort().join(","),
    ],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - Number(period));
      from.setHours(0, 0, 0, 0);
      let transactionQuery = supabase
        .from("point_transactions")
        .select("membership_id,location_id,type,amount_cents,points_delta,created_at")
        .gte("created_at", from.toISOString())
        .order("created_at");
      let membershipQuery = supabase
        .from("memberships")
        .select(
          "id,joined_at,acquisition_location_id,cached_points_balance,customers(first_name,last_name,last_activity_at)",
        );
      if (orgId) {
        transactionQuery = transactionQuery.eq("organization_id", orgId);
        membershipQuery = membershipQuery.eq("organization_id", orgId);
      }
      const scopedLocationIds = selectedLocationIds;
      if (scopedLocationIds.length) {
        transactionQuery = transactionQuery.in("location_id", scopedLocationIds);
        membershipQuery = membershipQuery.in("acquisition_location_id", scopedLocationIds);
      }

      let passesQuery = supabase
        .from("wallet_passes")
        .select("provider,memberships!inner(organization_id,acquisition_location_id)");
      let rewardsQuery = supabase
        .from("redemptions")
        .select("id,created_at")
        .gte("created_at", from.toISOString());
      let earnedQuery = supabase
        .from("customer_rewards")
        .select("id,status,awarded_at,memberships!inner(organization_id,acquisition_location_id)")
        .gte("awarded_at", from.toISOString());
      if (orgId) {
        passesQuery = passesQuery.eq("memberships.organization_id", orgId);
        rewardsQuery = rewardsQuery.eq("organization_id", orgId);
        earnedQuery = earnedQuery.eq("memberships.organization_id", orgId);
      }
      if (scopedLocationIds.length) {
        passesQuery = passesQuery.in("memberships.acquisition_location_id", scopedLocationIds);
        rewardsQuery = rewardsQuery.in("location_id", scopedLocationIds);
        earnedQuery = earnedQuery.in("memberships.acquisition_location_id", scopedLocationIds);
      }
      const [transactions, memberships, passes, rewards, earned] = await Promise.all([
        transactionQuery,
        membershipQuery,
        passesQuery,
        rewardsQuery,
        earnedQuery,
      ]);
      if (transactions.error) throw transactions.error;
      const tx = transactions.data ?? [];
      const purchases = tx.filter((item) => item.type === "purchase");
      const sales = purchases.reduce((sum, item) => sum + (item.amount_cents ?? 0), 0);
      const months = Array.from({ length: 12 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - 11 + index, 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          label: new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date),
          ventas: 0,
          altas: 0,
        };
      });
      for (const item of purchases) {
        const key = item.created_at.slice(0, 7);
        const month = months.find((value) => value.key === key);
        if (month) month.ventas += (item.amount_cents ?? 0) / 100;
      }
      for (const item of memberships.data ?? []) {
        const key = item.joined_at.slice(0, 7);
        const month = months.find((value) => value.key === key);
        if (month) month.altas++;
      }
      const spend = new Map<string, number>();
      for (const item of purchases)
        spend.set(
          item.membership_id,
          (spend.get(item.membership_id) ?? 0) + (item.amount_cents ?? 0),
        );
      const top = (memberships.data ?? [])
        .map((member) => ({
          id: member.id,
          name: [member.customers?.first_name, member.customers?.last_name]
            .filter(Boolean)
            .join(" "),
          spend: spend.get(member.id) ?? 0,
          balance: member.cached_points_balance,
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);
      const active = (memberships.data ?? []).filter(
        (member) =>
          member.customers?.last_activity_at &&
          new Date(member.customers.last_activity_at) > new Date(Date.now() - 90 * 86400000),
      ).length;
      const inactive = (memberships.data ?? []).length - active;
      const newMembers = (memberships.data ?? []).filter(
        (member) => new Date(member.joined_at) >= from,
      ).length;
      const recurring = [...spend.keys()].filter(
        (membershipId) =>
          purchases.filter((item) => item.membership_id === membershipId).length >= 2,
      ).length;
      const filteredEarned = earned.data ?? [];
      const generated = filteredEarned.length;
      const redeemed = filteredEarned.filter((item) => item.status === "redeemed").length;
      return {
        months,
        top,
        members: (memberships.data ?? []).length,
        active,
        inactive,
        newMembers,
        recurring,
        purchases: purchases.length,
        sales,
        average: purchases.length ? Math.round(sales / purchases.length) : 0,
        redemptions: (rewards.data ?? []).length,
        generated,
        redemptionRate: generated ? Math.round((redeemed / generated) * 100) : 0,
        retentionRate: (memberships.data ?? []).length
          ? Math.round((recurring / (memberships.data ?? []).length) * 100)
          : 0,
        averageLoyalty: (memberships.data ?? []).length
          ? Math.round(
              (memberships.data ?? []).reduce(
                (sum, member) => sum + member.cached_points_balance,
                0,
              ) / (memberships.data ?? []).length,
            )
          : 0,
        apple: (passes.data ?? []).filter((pass) => pass.provider === "apple").length,
        google: (passes.data ?? []).filter((pass) => pass.provider === "google").length,
      };
    },
  });
  return (
    <>
      <PageHeader
        title="Estadísticas"
        description="Evolución anual, actividad, ingresos registrados y fidelidad."
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
                <SelectItem value="365">Último año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Clientes" value={num(data?.members)} />
            <MetricCard label="Nuevos clientes" value={num(data?.newMembers)} />
            <MetricCard label="Activos (90 días)" value={num(data?.active)} />
            <MetricCard label="Inactivos" value={num(data?.inactive)} />
            <MetricCard label="Ingresos registrados" value={eur(data?.sales)} />
            <MetricCard label="Ticket medio" value={eur(data?.average)} />
            <MetricCard label="Compras" value={num(data?.purchases)} />
            <MetricCard label="Canjes" value={num(data?.redemptions)} />
            <MetricCard label="Recompensas generadas" value={num(data?.generated)} />
            <MetricCard label="Tasa de canje" value={`${num(data?.redemptionRate)}%`} />
            <MetricCard label="Retención" value={`${num(data?.retentionRate)}%`} />
            <MetricCard label="Fidelidad media" value={num(data?.averageLoyalty)} />
            <MetricCard label="Apple Wallet" value={num(data?.apple)} />
            <MetricCard label="Google Wallet" value={num(data?.google)} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <section className="surface p-5">
              <h2 className="font-display text-lg font-semibold">Ventas y altas · 12 meses</h2>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.months ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number" ? `${value.toLocaleString("es-ES")} €` : value
                      }
                    />
                    <Bar dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="altas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="surface overflow-hidden">
              <h2 className="border-b px-5 py-4 font-display text-lg font-semibold">
                Top clientes
              </h2>
              <ol className="divide-y">
                {(data?.top ?? []).map((client, index) => (
                  <li key={client.id} className="flex justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {index + 1}. {client.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{num(client.balance)} puntos</p>
                    </div>
                    <span className="text-sm font-medium">{eur(client.spend)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <ActivityLog />
        </>
      )}
    </>
  );
}
