import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, RotateCcw, Wallet } from "lucide-react";
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
import { adjustPoints, requestWalletUpdate, reverseTransaction } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/panel/clientes/$membershipId")({
  component: ClienteDetalle,
});

function ClienteDetalle() {
  const { membershipId } = Route.useParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const canAdjust = session?.org?.can_adjust_points ?? false;

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["membership", membershipId],
    queryFn: async () => {
      const [m, t, p, earned] = await Promise.all([
        supabase
          .from("memberships")
          .select(
            "id, public_id, cached_points_balance, status, joined_at, customers(first_name, last_name, email, phone)",
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
          .select("id, status, awarded_at, redeemed_at, rewards(name)")
          .eq("membership_id", membershipId)
          .order("awarded_at", { ascending: false }),
      ]);
      if (m.error) throw m.error;
      return {
        membership: m.data,
        transactions: t.data ?? [],
        passes: p.data ?? [],
        earned: earned.data ?? [],
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
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const syncWallet = async () => {
    try {
      await requestWalletUpdate(membershipId);
      toast.success("Actualización de tarjeta solicitada");
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
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
            <Button variant="outline" onClick={() => void syncWallet()}>
              <Wallet aria-hidden className="size-4" /> Actualizar tarjeta
            </Button>
            <Button asChild variant="outline">
              <a href={`/mi-tarjeta/${m.public_id}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden className="size-4" /> Ver portal
              </a>
            </Button>
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
                rewards: { name: string } | null;
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
