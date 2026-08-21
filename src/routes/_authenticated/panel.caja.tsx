import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Check,
  CreditCard,
  Gift,
  Keyboard,
  Loader2,
  Receipt,
  Search,
  TicketPercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { QrScanner } from "@/components/app/qr-scanner";
import { useSession, getActiveLocation, setActiveLocation } from "@/lib/session";
import { computePoints, eur, num, parseAmountToCents, ruleText } from "@/lib/format";
import {
  recordPurchase,
  redeemReward,
  resolveMembershipQr,
  searchMemberships,
  redeemCoupon,
  consumeGiftCard,
  consumeCashback,
  type ScanResult,
} from "@/lib/operations";

export const Route = createFileRoute("/_authenticated/panel/caja")({
  component: CajaPage,
});

type Mode = "scan" | "manual" | "gift";

function CajaPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const locations = useMemo(() => session?.locations ?? [], [session]);
  const [locationId, setLocationId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("scan");
  const [manualCode, setManualCode] = useState("");
  const [matches, setMatches] = useState<ScanResult[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [ticket, setTicket] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [cashbackAmount, setCashbackAmount] = useState("");
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

  const search = async () => {
    if (!locationId || busy || manualCode.trim().length < 2) return;
    setBusy(true);
    try {
      const results = await searchMemberships(manualCode.trim(), locationId);
      setMatches(results.filter(Boolean));
      if (results.length === 1 && results[0]) setScan(results[0]);
      if (results.length === 0) toast.error("No se encontró ningún cliente");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cents = parseAmountToCents(amount);
  const mechanic = scan?.program.mechanic_type ?? "points";
  const unit =
    mechanic === "stamps"
      ? "sellos"
      : mechanic === "cashback"
        ? "céntimos"
        : mechanic === "spend"
          ? "€ acumulados"
          : "puntos";
  const preview =
    scan && cents !== null
      ? mechanic === "stamps"
        ? Number((scan.program.mechanic_config as Record<string, number> | null)?.["stamps_per_purchase"] ?? 1)
        : mechanic === "cashback"
          ? Math.floor((cents * Number((scan.program.mechanic_config as Record<string, number> | null)?.["percentage"] ?? 5)) / 100)
          : mechanic === "membership"
            ? 0
            : computePoints(
                cents,
                scan.program.earning_mode,
                scan.program.earning_value,
                scan.program.rounding_mode,
              )
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
      const earned = res.earned_rewards?.map((reward) => reward.name).join(", ");
      toast.success(
        res.duplicate ? "Operación ya registrada" : `+${num(res.points_awarded)} ${unit}`,
        {
          description: earned
            ? `Recompensa obtenida: ${earned} · Saldo: ${num(res.resulting_balance)} ${unit}`
            : `Saldo: ${num(res.resulting_balance)} ${unit}`,
        },
      );
      setScan({
        ...scan,
        balance: res.resulting_balance,
        rewards: scan.rewards.map((r) => ({
          ...r,
          available: res.resulting_balance >= r.points_cost,
        })),
      });
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

  const confirmCoupon = async () => {
    if (!scan || couponCode.trim().length < 3) return;
    setBusy(true);
    try {
      const result = await redeemCoupon(scan.membership_id, couponCode.trim(), locationId);
      toast.success(`Cupón canjeado: ${result.title}`, {
        description:
          result.discount_type === "percentage"
            ? `${result.discount_value}% de descuento`
            : `${eur(result.discount_value)} de descuento`,
      });
      setCouponCode("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmGiftCard = async () => {
    const amountCents = parseAmountToCents(giftAmount);
    if (!locationId || !giftCode.trim() || amountCents === null) {
      toast.error("Introduce código e importe válidos");
      return;
    }
    setBusy(true);
    try {
      const result = await consumeGiftCard(giftCode.trim(), locationId, amountCents);
      toast.success("Consumo registrado", {
        description: `Saldo restante: ${eur(result.resulting_balance_cents)}`,
      });
      setGiftCode("");
      setGiftAmount("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCashback = async () => {
    if (!scan) return;
    const amountCents = parseAmountToCents(cashbackAmount);
    if (amountCents === null) {
      toast.error("Introduce un importe válido");
      return;
    }
    setBusy(true);
    try {
      const result = await consumeCashback(scan.membership_id, locationId, amountCents);
      toast.success("Cashback utilizado", {
        description: `Saldo restante: ${eur(result.resulting_balance_cents)}`,
      });
      setScan({ ...scan, balance: result.resulting_balance_cents });
      setCashbackAmount("");
    } catch (error) {
      toast.error((error as Error).message);
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
      toast.success(`Canje: ${res.reward_name}`, {
        description: `Saldo: ${num(res.resulting_balance)} puntos`,
      });
      setScan({
        ...scan,
        balance: res.resulting_balance,
        rewards: scan.rewards.map((r) => ({
          ...r,
          available: res.resulting_balance >= r.points_cost,
        })),
      });
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
        description="Escanea la tarjeta o busca al cliente para registrar una operación."
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
            <Button
              variant={mode === "scan" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("scan")}
            >
              <Camera aria-hidden className="size-4" /> Escanear
            </Button>
            <Button
              variant={mode === "manual" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("manual")}
            >
              <Keyboard aria-hidden className="size-4" /> Buscar
            </Button>
            <Button
              variant={mode === "gift" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("gift")}
            >
              <CreditCard aria-hidden className="size-4" /> Regalo
            </Button>
          </div>

          {mode === "scan" ? (
            <QrScanner active onResult={(v) => void resolve(v)} />
          ) : mode === "manual" ? (
            <form
              className="surface space-y-3 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <Label htmlFor="code">Nombre, email, teléfono o número de socio</Label>
              <Input
                id="code"
                autoFocus
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setMatches([]);
                }}
                placeholder="Buscar cliente"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={busy || manualCode.trim().length < 2}
              >
                {busy ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Search aria-hidden className="size-4" />
                )}{" "}
                Buscar cliente
              </Button>
              {matches.length > 1 ? (
                <ul className="divide-y rounded-lg border">
                  {matches.map((match) => (
                    <li key={match.membership_id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-secondary"
                        onClick={() => setScan(match)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {match.customer_name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {match.customer_email}
                          </span>
                        </span>
                        <Badge variant="secondary">{num(match.balance)} pts</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </form>
          ) : (
            <form
              className="surface space-y-4 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void confirmGiftCard();
              }}
            >
              <div className="flex items-center gap-2 font-medium">
                <CreditCard className="size-4 text-primary" /> Consumir tarjeta regalo
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gift-code">Código</Label>
                <Input
                  id="gift-code"
                  className="font-mono uppercase"
                  value={giftCode}
                  onChange={(event) => setGiftCode(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gift-amount">Importe (€)</Label>
                <Input
                  id="gift-amount"
                  inputMode="decimal"
                  value={giftAmount}
                  onChange={(event) => setGiftAmount(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Confirmar consumo
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
                <p className="metric-value text-sidebar-primary">
                  {mechanic === "cashback" ? eur(scan.balance) : `${num(scan.balance)} ${unit}`}
                </p>
              </div>
              <Badge variant="secondary" className="font-mono">
                {scan.short_code}
              </Badge>
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
                <p className="text-xs text-muted-foreground">Progreso a añadir</p>
                <p className="metric-value">{preview !== null ? `+${num(preview)}` : "—"}</p>
                {cents !== null ? (
                  <p className="text-xs text-muted-foreground">sobre {eur(cents)}</p>
                ) : null}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy || cents === null}>
                {busy ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Check aria-hidden className="size-4" />
                )}
                Confirmar compra
              </Button>
            </form>
          ) : null}

          {mechanic === "cashback" && scan.balance > 0 ? (
            <form
              className="surface space-y-3 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void confirmCashback();
              }}
            >
              <div className="font-medium">Utilizar cashback</div>
              <div className="space-y-1.5">
                <Label htmlFor="cashback-amount">Importe a descontar (€)</Label>
                <Input
                  id="cashback-amount"
                  inputMode="decimal"
                  value={cashbackAmount}
                  onChange={(event) => setCashbackAmount(event.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy}>
                Aplicar cashback
              </Button>
            </form>
          ) : null}

          <form
            className="surface space-y-3 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmCoupon();
            }}
          >
            <div className="flex items-center gap-2 font-medium">
              <TicketPercent className="size-4 text-primary" /> Canjear cupón
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-code">Código del cupón</Label>
              <Input
                id="coupon-code"
                className="font-mono uppercase"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy || couponCode.trim().length < 3}
            >
              Validar cupón
            </Button>
          </form>

          {scan.program.allow_redeeming && scan.rewards.length > 0 ? (
            <div className="surface p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gift aria-hidden className="size-4 text-primary" /> Canjear recompensa
              </div>
              <ul className="mt-3 space-y-2">
                {scan.rewards.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
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
