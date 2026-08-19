import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check, Gift, Keyboard, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { QrScanner } from "@/components/app/qr-scanner";
import { useSession, getActiveLocation, setActiveLocation } from "@/lib/session";
import { computePoints, eur, num, parseAmountToCents, ruleText } from "@/lib/format";
import { recordPurchase, redeemReward, resolveMembershipQr, type ScanResult } from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/panel/caja")({
  component: CajaPage,
});

type Mode = "scan" | "manual";

function CajaPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const locations = useMemo(() => session?.locations ?? [], [session]);
  const [locationId, setLocationId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("scan");
  const [manualCode, setManualCode] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [ticket, setTicket] = useState("");
  const idemRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (locations.length === 0) return;
    const stored = getActiveLocation();
    const valid = locations.find((l) => l.id === stored)?.id ?? locations[0]!.id;
    setLocationId(valid);
  }, [locations]);

  const chooseLocation = (id: string) => {
    setLocationId(id);
    setActiveLocation(id);
  };

  const resolve = async (token: string) => {
    if (!locationId || busy) return;
    setBusy(true);
    try {
      const result = await resolveMembershipQr(token, locationId);
      setScan(result);
      idemRef.current = crypto.randomUUID();
      setAmount("");
      setTicket("");
    } catch (e) {
      toast.error((e as Error).message);
      setMode("manual");
    } finally {
      setBusy(false);
    }
  };

  const cents = parseAmountToCents(amount);
  const preview =
    scan && cents !== null
      ? computePoints(cents, scan.program.earning_mode, scan.program.earning_value, scan.program.rounding_mode)
      : null;

  const confirmPurchase = async () => {
    if (!scan || cents === null) {
      toast.error("Introduce un importe válido");
      return;
    }
    setBusy(true);
    try {
      const res = await recordPurchase({
        membershipId: scan.membership_id,
        locationId,
        amountCents: cents,
        ticketReference: ticket || null,
        idempotencyKey: idemRef.current,
      });
      toast.success(res.duplicate ? "Operación ya registrada" : `+${num(res.points_awarded)} puntos`, {
        description: `Saldo: ${num(res.resulting_balance)} puntos`,
      });
      setScan({ ...scan, balance: res.resulting_balance, rewards: scan.rewards.map((r) => ({ ...r, available: res.resulting_balance >= r.points_cost })) });
      idemRef.current = crypto.randomUUID();
      setAmount("");
      setTicket("");
      void queryClient.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmRedeem = async (rewardId: string) => {
    if (!scan) return;
    setBusy(true);
    try {
      const res = await redeemReward({
        membershipId: scan.membership_id,
        rewardId,
        locationId,
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`Canje: ${res.reward_name}`, { description: `Saldo: ${num(res.resulting_balance)} puntos` });
      setScan({ ...scan, balance: res.resulting_balance, rewards: scan.rewards.map((r) => ({ ...r, available: res.resulting_balance >= r.points_cost })) });
      void queryClient.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (locations.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <p className="font-display text-lg font-semibold">Sin establecimientos asignados</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pide a un administrador que te asigne al menos un establecimiento.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Caja"
        description="Escanea la tarjeta del cliente, introduce el importe y confirma."
        actions={
          <Select value={locationId} onValueChange={chooseLocation}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Establecimiento" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {!scan ? (
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "scan" ? "default" : "outline"} className="flex-1" onClick={() => setMode("scan")}>
              <Camera aria-hidden className="size-4" /> Escanear
            </Button>
            <Button variant={mode === "manual" ? "default" : "outline"} className="flex-1" onClick={() => setMode("manual")}>
              <Keyboard aria-hidden className="size-4" /> Código
            </Button>
          </div>

          {mode === "scan" ? (
            <QrScanner active onResult={(v) => void resolve(v)} />
          ) : (
            <form
              className="surface space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void resolve(manualCode.trim().toUpperCase());
              }}
            >
              <Label htmlFor="code">Código corto de la tarjeta</Label>
              <Input
                id="code"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Ej. 7KD4P2"
                className="text-center font-mono text-lg tracking-[0.3em]"
              />
              <Button type="submit" className="w-full" disabled={busy || manualCode.length < 4}>
                {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null} Buscar cliente
              </Button>
            </form>
          )}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-md space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setScan(null)}>
            <ArrowLeft aria-hidden className="size-4" /> Nueva operación
          </Button>

          <div className="surface bg-sidebar p-5 text-sidebar-foreground">
            <p className="text-xs uppercase tracking-wide text-sidebar-foreground/70">Cliente</p>
            <p className="font-display text-xl font-semibold">{scan.customer_name}</p>
            <p className="text-xs text-sidebar-foreground/70">{scan.customer_email}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-sidebar-foreground/70">Saldo</p>
                <p className="metric-value text-sidebar-primary">{num(scan.balance)} pts</p>
              </div>
              <Badge variant="secondary" className="font-mono">{scan.short_code}</Badge>
            </div>
          </div>

          {scan.program.allow_earning ? (
            <form
              className="surface space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void confirmPurchase();
              }}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Receipt aria-hidden className="size-4 text-primary" /> Registrar compra
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Importe (€)</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-14 text-center text-3xl font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  {ruleText(scan.program.earning_mode, scan.program.earning_value)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket">Referencia de ticket (opcional)</Label>
                <Input id="ticket" value={ticket} onChange={(e) => setTicket(e.target.value)} />
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center">
                <p className="text-xs text-muted-foreground">Puntos a otorgar</p>
                <p className="metric-value">{preview !== null ? `+${num(preview)}` : "—"}</p>
                {cents !== null ? <p className="text-xs text-muted-foreground">sobre {eur(cents)}</p> : null}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy || cents === null}>
                {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
                Confirmar compra
              </Button>
            </form>
          ) : null}

          {scan.program.allow_redeeming && scan.rewards.length > 0 ? (
            <div className="surface p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gift aria-hidden className="size-4 text-primary" /> Canjear recompensa
              </div>
              <ul className="mt-3 space-y-2">
                {scan.rewards.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{num(r.points_cost)} puntos</p>
                    </div>
                    <Button
                      size="sm"
                      variant={r.available ? "default" : "outline"}
                      disabled={!r.available || busy}
                      onClick={() => void confirmRedeem(r.id)}
                    >
                      {r.available ? "Canjear" : "Sin saldo"}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
