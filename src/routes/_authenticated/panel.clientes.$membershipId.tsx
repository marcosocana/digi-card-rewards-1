import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  ExternalLink,
  Gift,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/session";
import { dateTime, eur, num, txnLabel } from "@/lib/format";
import { adjustPoints, redeemReward, syncGoogleWallet } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/panel/clientes/$membershipId")({
  component: ClienteDetalle,
});

const parsePointsDelta = (rawValue: string) => {
  const normalized = rawValue.trim().replaceAll("−", "-").replaceAll(" ", "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return Number.NaN;
  return Number(normalized);
};

const roundPointsDelta = (value: number) => Math.sign(value) * Math.round(Math.abs(value));

function ClienteDetalle() {
  const { membershipId } = Route.useParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const canAdjust = session?.isSuperadmin || (session?.org?.can_adjust_points ?? false);

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [rewardToRedeemId, setRewardToRedeemId] = useState<string | null>(null);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["membership", membershipId],
    queryFn: async () => {
      const [m, t, p, deliveries] = await Promise.all([
        supabase
          .from("memberships")
          .select(
            "id, public_id, program_id, cached_points_balance, status, joined_at, acquisition_location_id, customers(first_name, last_name, email, phone), loyalty_programs(mechanic_type,mechanic_config)",
          )
          .eq("id", membershipId)
          .maybeSingle(),
        supabase
          .from("point_transactions")
          .select("id, type, points_delta, amount_cents, note, created_at, reversed_at")
          .eq("membership_id", membershipId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("wallet_passes")
          .select("provider, status, is_sandbox, last_updated_at")
          .eq("membership_id", membershipId),
        supabase
          .from("notification_deliveries")
          .select("id,status,provider,created_at,notifications(title,message)")
          .eq("membership_id", membershipId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (m.error) throw m.error;
      if (t.error) throw t.error;
      if (p.error) throw p.error;
      if (deliveries.error) throw deliveries.error;

      const mechanic = m.data?.loyalty_programs?.mechanic_type === "stamps" ? "stamps" : "points";

      const rewardsResult = m.data?.program_id
        ? await supabase
            .from("rewards")
            .select(
              "id,name,description,points_cost,status,mechanic_type,redemption_limit_type,redemption_limit_count,reward_locations(location_id)",
            )
            .eq("program_id", m.data.program_id)
            .eq("mechanic_type", mechanic)
            .order("points_cost")
        : { data: [], error: null };
      if (rewardsResult.error) throw rewardsResult.error;
      const rewardIds = (rewardsResult.data ?? []).map((reward) => reward.id);
      const redemptionsResult = rewardIds.length
        ? await supabase
            .from("redemptions")
            .select("reward_id,membership_id")
            .in("reward_id", rewardIds)
        : { data: [], error: null };
      if (redemptionsResult.error) throw redemptionsResult.error;
      const segmentsResult = await supabase.rpc("get_membership_segments", {
        _membership_id: membershipId,
      });
      return {
        membership: m.data,
        transactions: t.data ?? [],
        passes: p.data ?? [],
        rewards: rewardsResult.data ?? [],
        redemptions: redemptionsResult.data ?? [],
        deliveries: deliveries.data ?? [],
        segments: segmentsResult.error ? [] : (segmentsResult.data ?? []),
      };
    },
  });

  const submitAdjust = async () => {
    const parsedValue = parsePointsDelta(delta);
    if (
      !Number.isFinite(parsedValue) ||
      Math.abs(parsedValue) < 1 ||
      Math.abs(parsedValue) > 100_000
    ) {
      toast.error("Introduce un valor entre 1 y 100.000");
      return;
    }
    const value = roundPointsDelta(parsedValue);
    if (reason.trim().length < 3) {
      toast.error("Indica un motivo");
      return;
    }
    try {
      const res = await adjustPoints({ membershipId, delta: value, reason: reason.trim() });
      toast.success(`Nuevo saldo: ${num(res.resulting_balance)} puntos`);
      try {
        await syncGoogleWallet(membershipId);
      } catch (walletError) {
        toast.warning("Los puntos se guardaron, pero Google Wallet quedó pendiente", {
          description: (walletError as Error).message,
        });
      }
      setOpen(false);
      setDelta("");
      setReason("");
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["memberships"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportData = async () => {
    const { data: result, error } = await supabase.rpc("export_customer_data", {
      _membership_id: membershipId,
    });
    if (error) {
      toast.error("No se pudo exportar", { description: error.message });
      return;
    }
    const payload = (result ?? {}) as Record<string, unknown>;
    const escape = (value: unknown) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const displayValue = (value: unknown) =>
      value && typeof value === "object" ? JSON.stringify(value) : value;
    const sections = Object.entries(payload)
      .map(([section, value]) => {
        if (Array.isArray(value)) {
          const records = value.map((item) =>
            item && typeof item === "object" ? (item as Record<string, unknown>) : { valor: item },
          );
          const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
          return `<h2>${escape(section)}</h2><table><thead><tr>${columns
            .map((column) => `<th>${escape(column)}</th>`)
            .join("")}</tr></thead><tbody>${records
            .map(
              (record) =>
                `<tr>${columns
                  .map((column) => `<td>${escape(displayValue(record[column]))}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody></table>`;
        }
        const record =
          value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : { valor: value };
        return `<h2>${escape(section)}</h2><table><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${Object.entries(
          record,
        )
          .map(
            ([key, item]) =>
              `<tr><td>${escape(key)}</td><td>${escape(displayValue(item))}</td></tr>`,
          )
          .join("")}</tbody></table>`;
      })
      .join("");
    const workbook = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111}h2{margin:24px 0 8px;text-transform:capitalize}table{border-collapse:collapse;margin-bottom:18px}th{background:#f2f2f2;font-weight:700}th,td{border:1px solid #ccc;padding:7px 10px;text-align:left;vertical-align:top;white-space:nowrap}</style></head><body>${sections}</body></html>`;
    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `datos-cliente-${data?.membership?.public_id ?? membershipId}.xls`;
    anchor.click();
    URL.revokeObjectURL(href);
    toast.success("Archivo Excel descargado");
  };

  const redeem = async (selectedRewardId: string) => {
    if (!selectedRewardId || !data?.membership?.acquisition_location_id) return;
    setRedeemingRewardId(selectedRewardId);
    try {
      const result = await redeemReward({
        membershipId,
        rewardId: selectedRewardId,
        locationId: data.membership.acquisition_location_id,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`${result.reward_name} canjeada`, {
        description: `Nuevo saldo: ${num(result.resulting_balance)} puntos`,
      });
      setRewardToRedeemId(null);
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["memberships"] })]);
      try {
        await syncGoogleWallet(membershipId);
      } catch {
        toast.warning("El canje se guardó, pero la tarjeta Wallet quedó pendiente");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRedeemingRewardId(null);
    }
  };

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  const m = data?.membership;
  if (!m) return <p className="text-sm text-muted-foreground">No se encontró la membresía.</p>;
  const c = m.customers as {
    first_name: string;
    last_name: string | null;
    email: string;
    phone: string | null;
  } | null;
  const program = m.loyalty_programs as {
    mechanic_type: string;
    mechanic_config: Record<string, unknown> | null;
  } | null;
  const isStampProgram = program?.mechanic_type === "stamps";
  const stampTarget = Math.min(
    20,
    Math.max(5, Math.round(Number(program?.mechanic_config?.stamp_target ?? 10))),
  );
  const parsedDelta = parsePointsDelta(delta);
  const roundedDelta = Number.isFinite(parsedDelta) ? roundPointsDelta(parsedDelta) : null;
  const validDelta =
    roundedDelta !== null && Math.abs(parsedDelta) >= 1 && Math.abs(parsedDelta) <= 100_000;
  const resultingBalance = validDelta ? Math.max(m.cached_points_balance + roundedDelta, 0) : null;
  const customerRedemptionCounts = new Map<string, number>();
  const globalRedemptionCounts = new Map<string, number>();
  data.redemptions.forEach((redemption) => {
    globalRedemptionCounts.set(
      redemption.reward_id,
      (globalRedemptionCounts.get(redemption.reward_id) ?? 0) + 1,
    );
    if (redemption.membership_id === membershipId) {
      customerRedemptionCounts.set(
        redemption.reward_id,
        (customerRedemptionCounts.get(redemption.reward_id) ?? 0) + 1,
      );
    }
  });
  const rewardToRedeem = data.rewards.find((reward) => reward.id === rewardToRedeemId);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/panel/clientes">
          <ArrowLeft aria-hidden className="size-4" /> Clientes
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-bold sm:text-4xl">
            {`${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim() || "Cliente"}
          </h1>
          {[c?.email, c?.phone].filter(Boolean).length ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {[c?.email, c?.phone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Segmentos:</span>
            {data.segments.length ? (
              data.segments.map((segment) => (
                <Badge key={segment.id} variant="secondary">
                  {segment.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Sin segmentos</span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 md:hidden">
              Opciones <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 md:hidden">
            {canAdjust ? (
              <DropdownMenuItem onSelect={() => void exportData()}>
                <Download /> Exportar datos
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <a href={`/mi-tarjeta/${m.public_id}`} target="_blank" rel="noreferrer">
                <ExternalLink /> Ver portal
              </a>
            </DropdownMenuItem>
            {canAdjust ? (
              <DropdownMenuItem onSelect={() => setOpen(true)}>
                <SlidersHorizontal /> Ajustar puntos
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="surface hidden flex-wrap items-center gap-2 p-3 md:flex">
        {canAdjust ? (
          <Button variant="outline" onClick={() => void exportData()}>
            <Download aria-hidden className="size-4" /> Exportar datos
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <a href={`/mi-tarjeta/${m.public_id}`} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden className="size-4" /> Ver portal
          </a>
        </Button>
        {canAdjust ? (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="size-4" /> Ajustar puntos
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste manual de puntos</DialogTitle>
            <DialogDescription>
              Queda registrado en el histórico con tu usuario y el motivo indicado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="delta">Puntos (positivo o negativo)</Label>
              <Input
                id="delta"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ej.: +10,5 o -10,5"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Introduce una variación entre 1 y 100.000, no el saldo final. Los decimales se
                redondean al entero más próximo.
                {resultingBalance !== null && roundedDelta !== null
                  ? ` Se aplicarán ${roundedDelta > 0 ? "+" : ""}${num(roundedDelta)} puntos y el saldo pasará de ${num(m.cached_points_balance)} a ${num(resultingBalance)}.`
                  : ""}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void submitAdjust()}>Aplicar ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
          <p className="metric-value">{num(m.cached_points_balance)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
          <p className="mt-2 text-sm font-medium capitalize">{m.status}</p>
          <p className="text-xs text-muted-foreground">Alta {dateTime(m.joined_at)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tarjetas Wallet</p>
          {data.passes.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {data.passes.map((p) => (
                <li key={p.provider} className="flex items-center justify-between">
                  <span className="capitalize">{p.provider}</span>
                  <Badge variant="outline">{p.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sin tarjetas generadas</p>
          )}
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Recompensas</h2>
            <p className="text-xs text-muted-foreground">
              Catálogo completo y estado de canje de este cliente.
            </p>
          </div>
          <Badge variant="secondary">{data.rewards.length}</Badge>
        </div>
        {data.rewards.length ? (
          <ul className="divide-y">
            {data.rewards.map((reward) => {
              const customerCount = customerRedemptionCounts.get(reward.id) ?? 0;
              const globalCount = globalRedemptionCounts.get(reward.id) ?? 0;
              const locations = reward.reward_locations as Array<{ location_id: string }>;
              const locationAvailable =
                locations.length === 0 ||
                locations.some((location) => location.location_id === m.acquisition_location_id);
              const customerLimitReached =
                reward.redemption_limit_type === "per_customer" &&
                customerCount >= (reward.redemption_limit_count ?? 0);
              const globalLimitReached =
                reward.redemption_limit_type === "global" &&
                globalCount >= (reward.redemption_limit_count ?? 0);
              const redemptionCost = isStampProgram ? stampTarget : reward.points_cost;
              const hasPoints = m.cached_points_balance >= redemptionCost;
              const available =
                reward.status === "active" &&
                Boolean(m.acquisition_location_id) &&
                locationAvailable &&
                hasPoints &&
                !customerLimitReached &&
                !globalLimitReached;
              const unavailableReason =
                reward.status !== "active"
                  ? "Pausada"
                  : !locationAvailable || !m.acquisition_location_id
                    ? "No disponible en este establecimiento"
                    : customerLimitReached
                      ? "Límite personal alcanzado"
                      : globalLimitReached
                        ? "Límite global alcanzado"
                        : !hasPoints
                          ? `Faltan ${num(redemptionCost - m.cached_points_balance)} ${isStampProgram ? "sellos" : "puntos"}`
                          : null;
              return (
                <li
                  key={reward.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{reward.name}</p>
                      {!isStampProgram ? (
                        <Badge variant="outline" className="font-mono">
                          {num(reward.points_cost)} pts
                        </Badge>
                      ) : null}
                    </div>
                    {reward.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{reward.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Canjeada {customerCount} {customerCount === 1 ? "vez" : "veces"}
                      {reward.redemption_limit_type === "global" && reward.redemption_limit_count
                        ? ` · ${globalCount} de ${reward.redemption_limit_count} canjes globales`
                        : reward.redemption_limit_type === "per_customer" &&
                            reward.redemption_limit_count
                          ? ` · máximo ${reward.redemption_limit_count} por persona`
                          : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    {available ? (
                      <span className="text-sm font-medium text-emerald-600">Disponible</span>
                    ) : (
                      <span className="text-right text-sm font-medium text-red-600">
                        {unavailableReason}
                      </span>
                    )}
                    {available && canAdjust ? (
                      <Button
                        size="sm"
                        disabled={redeemingRewardId === reward.id}
                        onClick={() => setRewardToRedeemId(reward.id)}
                      >
                        <Gift className="size-4" />
                        Canjear
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Este programa todavía no tiene recompensas.
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(rewardToRedeemId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !redeemingRewardId) setRewardToRedeemId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar canje</DialogTitle>
            <DialogDescription>
              {isStampProgram
                ? `¿Quieres canjear “${rewardToRedeem?.name ?? "Recompensa"}”? Se completará la tarjeta de sellos del cliente.`
                : `¿Quieres canjear “${rewardToRedeem?.name ?? "Recompensa"}”? Se descontarán ${num(rewardToRedeem?.points_cost ?? 0)} puntos del saldo del cliente.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={Boolean(redeemingRewardId)}
              onClick={() => setRewardToRedeemId(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!rewardToRedeemId || Boolean(redeemingRewardId)}
              onClick={() => rewardToRedeemId && void redeem(rewardToRedeemId)}
            >
              {redeemingRewardId ? "Canjeando…" : "Confirmar canje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="surface overflow-hidden">
        <h2 className="border-b px-5 py-4 font-display text-lg font-semibold">
          Historial de notificaciones
        </h2>
        {data.deliveries.length ? (
          <ul className="divide-y">
            {data.deliveries.map((delivery) => (
              <li key={delivery.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {delivery.notifications?.title ?? "Notificación"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime(delivery.created_at)} · {delivery.provider ?? "sin pase"}
                  </p>
                </div>
                <Badge variant="secondary">{delivery.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-muted-foreground">Sin notificaciones registradas.</p>
        )}
      </div>

      <div className="surface overflow-hidden">
        <h2 className="border-b px-5 py-4 font-display text-lg font-semibold">
          Histórico de movimientos
        </h2>
        <ul className="divide-y">
          {data.transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {txnLabel[t.type] ?? t.type}
                  {t.reversed_at ? (
                    <span className="ml-2 text-xs text-muted-foreground">(anulado)</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {dateTime(t.created_at)}
                  {t.amount_cents ? ` · ${eur(t.amount_cents)}` : ""}
                  {t.note ? ` · ${t.note}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-sm">
                  {t.points_delta >= 0 ? "+" : ""}
                  {num(t.points_delta)}
                </span>
              </div>
            </li>
          ))}
          {data.transactions.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              Sin movimientos.
            </li>
          ) : null}
        </ul>
      </div>
    </>
  );
}
