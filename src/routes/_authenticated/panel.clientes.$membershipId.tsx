import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, Gift, RotateCcw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/session";
import { dateTime, eur, num, txnLabel } from "@/lib/format";
import {
  adjustPoints,
  redeemReward,
  requestWalletUpdate,
  reverseTransaction,
  syncGoogleWallet,
} from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/panel/clientes/$membershipId")({
  component: ClienteDetalle,
});

function ClienteDetalle() {
  const { membershipId } = Route.useParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const canAdjust = session?.isSuperadmin || (session?.org?.can_adjust_points ?? false);

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [rewardId, setRewardId] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["membership", membershipId],
    queryFn: async () => {
      const [m, t, p, earned, deliveries] = await Promise.all([
        supabase
          .from("memberships")
          .select(
            "id, public_id, cached_points_balance, status, joined_at, acquisition_location_id, customers(first_name, last_name, email, phone)",
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
          .from("customer_rewards")
          .select("id, status, awarded_at, redeemed_at, reward_id, rewards(name,points_cost)")
          .eq("membership_id", membershipId)
          .order("awarded_at", { ascending: false }),
        supabase
          .from("notification_deliveries")
          .select("id,status,provider,created_at,notifications(title,message)")
          .eq("membership_id", membershipId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (m.error) throw m.error;
      return {
        membership: m.data,
        transactions: t.data ?? [],
        passes: p.data ?? [],
        earned: earned.data ?? [],
        deliveries: deliveries.data ?? [],
      };
    },
  });

  const submitAdjust = async () => {
    const value = Number(delta);
    if (!Number.isInteger(value) || value === 0) {
      toast.error("Introduce un número entero distinto de cero");
      return;
    }
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

  const reverse = async (id: string) => {
    const motive = window.prompt("Motivo de la anulación");
    if (!motive || motive.trim().length < 3) return;
    try {
      const res = await reverseTransaction(id, motive.trim());
      toast.success(`Movimiento anulado. Saldo: ${num(res.resulting_balance)} puntos`);
      try {
        await syncGoogleWallet(membershipId);
      } catch (walletError) {
        toast.warning("El saldo se actualizó, pero Google Wallet quedó pendiente", {
          description: (walletError as Error).message,
        });
      }
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const syncWallet = async () => {
    try {
      await requestWalletUpdate(membershipId);
      const result = await syncGoogleWallet(membershipId);
      if (result.synced) toast.success("Tarjeta de Google Wallet actualizada");
      else toast.info("Este cliente todavía no tiene una tarjeta de Google Wallet instalada");
      void refetch();
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
    const rows: Array<[string, unknown]> = [];
    for (const [section, value] of Object.entries(payload)) {
      if (Array.isArray(value)) {
        rows.push([section.toUpperCase(), ""]);
        value.forEach((item, index) =>
          rows.push([`${index + 1}`, typeof item === "object" ? JSON.stringify(item) : item]),
        );
      } else if (value && typeof value === "object") {
        rows.push([section.toUpperCase(), ""]);
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) =>
          rows.push([key, typeof item === "object" ? JSON.stringify(item) : item]),
        );
      } else {
        rows.push([section, value]);
      }
    }
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${rows
      .map(([key, value]) => `<tr><td>${escape(key)}</td><td>${escape(value)}</td></tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `datos-cliente-${data?.membership?.public_id ?? membershipId}.xls`;
    anchor.click();
    URL.revokeObjectURL(href);
    toast.success("Archivo Excel descargado");
  };

  const redeem = async () => {
    if (!rewardId || !data?.membership?.acquisition_location_id) return;
    setRedeeming(true);
    try {
      const result = await redeemReward({
        membershipId,
        rewardId,
        locationId: data.membership.acquisition_location_id,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`${result.reward_name} canjeada`, {
        description: `Nuevo saldo: ${num(result.resulting_balance)} puntos`,
      });
      setRedeemOpen(false);
      setRewardId("");
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["memberships"] }),
      ]);
      try {
        await syncGoogleWallet(membershipId);
      } catch {
        toast.warning("El canje se guardó, pero la tarjeta Wallet quedó pendiente");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRedeeming(false);
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

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/panel/clientes">
          <ArrowLeft aria-hidden className="size-4" /> Clientes
        </Link>
      </Button>

      <PageHeader
        title={`${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim() || "Cliente"}
        description={[c?.email, c?.phone].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            {canAdjust ? (
              <Button variant="outline" onClick={() => void exportData()}>
                <Download aria-hidden className="size-4" /> Exportar datos
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void syncWallet()}>
              <Wallet aria-hidden className="size-4" /> Actualizar tarjeta
            </Button>
            <Button asChild variant="outline">
              <a href={`/mi-tarjeta/${m.public_id}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden className="size-4" /> Ver portal
              </a>
            </Button>
            {canAdjust ? (
              <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!data.earned.some((reward) => reward.status === "available")}
                  >
                    <Gift className="size-4" /> Canjear
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Canjear recompensa</DialogTitle>
                    <DialogDescription>
                      Selecciona una recompensa disponible. Sus puntos se descontarán
                      automáticamente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1.5">
                    <Label htmlFor="available-reward">Recompensa disponible</Label>
                    <select
                      id="available-reward"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={rewardId}
                      onChange={(event) => setRewardId(event.target.value)}
                    >
                      <option value="">Selecciona una recompensa</option>
                      {data.earned
                        .filter((reward) => reward.status === "available")
                        .map((reward) => (
                          <option key={reward.id} value={reward.reward_id}>
                            {reward.rewards?.name ?? "Recompensa"} · {reward.rewards?.points_cost} pts
                          </option>
                        ))}
                    </select>
                  </div>
                  <DialogFooter>
                    <Button disabled={!rewardId || redeeming} onClick={() => void redeem()}>
                      {redeeming ? "Canjeando…" : "Canjear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
            {canAdjust ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>Ajustar puntos</Button>
                </DialogTrigger>
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
                        inputMode="numeric"
                        value={delta}
                        onChange={(e) => setDelta(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reason">Motivo</Label>
                      <Input
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => void submitAdjust()}>Aplicar ajuste</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </>
        }
      />

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
        <h2 className="border-b px-5 py-4 font-display text-lg font-semibold">
          Recompensas obtenidas
        </h2>
        {data.earned.length ? (
          <ul className="divide-y">
            {data.earned.map(
              (earned: {
                id: string;
                status: string;
                awarded_at: string;
                reward_id: string;
                rewards: { name: string; points_cost: number } | null;
              }) => (
                <li key={earned.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{earned.rewards?.name ?? "Recompensa"}</p>
                    <p className="text-xs text-muted-foreground">
                      Obtenida {dateTime(earned.awarded_at)}
                    </p>
                  </div>
                  <Badge variant={earned.status === "available" ? "default" : "secondary"}>
                    {earned.status === "available"
                      ? "Disponible"
                      : earned.status === "redeemed"
                        ? "Canjeada"
                        : earned.status}
                  </Badge>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Todavía no ha obtenido recompensas.
          </p>
        )}
      </div>

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
                {canAdjust && !t.reversed_at && t.type !== "reversal" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Anular movimiento"
                    onClick={() => void reverse(t.id)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                ) : null}
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
