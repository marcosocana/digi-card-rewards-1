import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getMembershipPortal, getWalletInstallState } from "@/lib/operations";
import { Button } from "@/components/ui/button";
import { qrPngDataUrl } from "@/lib/qr";
import { dateTime, eur, num, ruleText, txnLabel } from "@/lib/format";

export const Route = createFileRoute("/mi-tarjeta/$publicId")({
  head: () => ({
    meta: [
      { title: "Mi tarjeta de fidelización" },
      {
        name: "description",
        content: "Consulta tus puntos, recompensas disponibles y movimientos recientes.",
      },
      { property: "og:title", content: "Mi tarjeta de fidelización" },
      { property: "og:description", content: "Puntos, recompensas y movimientos de tu tarjeta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const { publicId } = Route.useParams();
  const [qr, setQr] = useState<string | null>(null);
  const [googleWalletLoading, setGoogleWalletLoading] = useState(false);
  const [walletVerificationOpen, setWalletVerificationOpen] = useState(false);
  const [walletVerificationSent, setWalletVerificationSent] = useState(false);
  const [walletVerificationCode, setWalletVerificationCode] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["portal", publicId],
    queryFn: () => getMembershipPortal(publicId),
  });

  useEffect(() => {
    if (!data?.short_code) return;
    void qrPngDataUrl(data.short_code).then(setQr);
  }, [data?.short_code]);

  const addToWallet = async (provider: "apple" | "google") => {
    try {
      const state = await getWalletInstallState(publicId, provider);
      if (state.install_url) window.location.href = state.install_url;
      else toast.info("Wallet en modo demo", { description: state.message });
    } catch (error) {
      toast.error("No se pudo preparar la tarjeta", { description: (error as Error).message });
    }
  };

  const generateGoogleWallet = async (accessToken: string, walletWindow: Window | null) => {
    try {
      const { data: walletData, error } = await supabase.functions.invoke<{
        url?: string;
        error?: string;
      }>("generate-google-wallet", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          membershipPublicId: data.membership.public_id,
        },
      });

      if (error) throw error;
      if (!walletData?.url) throw new Error(walletData?.error ?? "La función no devolvió una URL.");

      if (walletWindow) walletWindow.location.href = walletData.url;
      else window.location.href = walletData.url;
    } catch (error) {
      walletWindow?.close();
      let message = error instanceof Error ? error.message : "Inténtalo de nuevo más tarde.";
      const context = (error as { context?: unknown } | null)?.context;
      if (context instanceof Response) {
        try {
          const body = (await context.clone().json()) as { error?: string; message?: string };
          message = body.error ?? body.message ?? message;
        } catch {
          // Conserva el mensaje original si la respuesta no contiene JSON.
        }
      }
      toast.error("No se pudo añadir la tarjeta a Google Wallet", {
        description: message,
      });
    }
  };

  const sendWalletVerification = async () => {
    const email = data?.customer.email.trim().toLowerCase();
    if (!email) throw new Error("No se ha encontrado el email del titular.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
    setWalletVerificationSent(true);
    toast.success("Código enviado", {
      description: "Revisa tu email para confirmar que eres el titular de la tarjeta.",
    });
  };

  const addToGoogleWallet = async () => {
    if (!data || googleWalletLoading) return;
    const walletWindow = window.open("about:blank", "_blank");
    if (walletWindow) walletWindow.opener = null;
    setGoogleWalletLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData.session;
      const sessionEmail = session?.user.email?.trim().toLowerCase();
      const customerEmail = data.customer.email.trim().toLowerCase();

      if (session?.access_token && sessionEmail === customerEmail) {
        await generateGoogleWallet(session.access_token, walletWindow);
        return;
      }

      walletWindow?.close();
      setWalletVerificationOpen(true);
      if (!walletVerificationSent) await sendWalletVerification();
    } catch (error) {
      walletWindow?.close();
      toast.error("No hemos podido verificar tu email", {
        description: error instanceof Error ? error.message : "Inténtalo de nuevo más tarde.",
      });
    } finally {
      setGoogleWalletLoading(false);
    }
  };

  const verifyWalletOwner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data || walletVerificationCode.trim().length < 6) {
      toast.error("Introduce el código recibido por email");
      return;
    }
    const walletWindow = window.open("about:blank", "_blank");
    if (walletWindow) walletWindow.opener = null;
    setGoogleWalletLoading(true);
    try {
      const { data: verificationData, error } = await supabase.auth.verifyOtp({
        email: data.customer.email.trim().toLowerCase(),
        token: walletVerificationCode.trim(),
        type: "email",
      });
      if (error || !verificationData.session?.access_token) {
        throw error ?? new Error("No se ha podido iniciar la sesión del titular.");
      }
      setWalletVerificationOpen(false);
      setWalletVerificationCode("");
      await generateGoogleWallet(verificationData.session.access_token, walletWindow);
    } catch (error) {
      walletWindow?.close();
      toast.error("El código no es válido o ha caducado", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGoogleWalletLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  if (!data)
    return (
      <main className="p-10 text-center text-sm text-muted-foreground">Tarjeta no encontrada.</main>
    );
  const mechanic = data.program.mechanic_type ?? "points";
  const mechanicConfig = (data.program.mechanic_config ?? {}) as Record<string, unknown>;
  const stampTarget = 10;
  const stampBalance = Math.min(stampTarget, Math.max(0, Math.round(data.membership.balance)));
  const stampSymbol: Record<string, string> = {
    coffee: "☕",
    check: "✓",
    star: "★",
    gift: "🎁",
    burger: "🍔",
    pizza: "🍕",
    beer: "🍺",
    cake: "🍰",
    heart: "♥",
    scissors: "✂",
  };
  const stampIcon = stampSymbol[String(mechanicConfig.stamp_icon ?? "check")] ?? "✓";
  const balanceLabel =
    mechanic === "cashback"
      ? eur(data.membership.balance)
      : mechanic === "stamps"
        ? `${num(stampBalance)} / ${stampTarget} sellos`
        : mechanic === "spend"
          ? `${num(data.membership.balance)} € acumulados`
          : `${num(data.membership.balance)} puntos`;

  return (
    <main className="min-h-screen bg-secondary px-5 py-10">
      <Dialog open={walletVerificationOpen} onOpenChange={setWalletVerificationOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Verifica que eres el titular</DialogTitle>
            <DialogDescription>
              Hemos enviado un código de 6 dígitos a {data.customer.email}. Introdúcelo para añadir
              esta tarjeta a Google Wallet.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={verifyWalletOwner}>
            <div className="space-y-2">
              <Label htmlFor="wallet-verification-code">Código de verificación</Label>
              <Input
                id="wallet-verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={walletVerificationCode}
                onChange={(event) =>
                  setWalletVerificationCode(event.target.value.replace(/\s/g, ""))
                }
                className="h-12 text-center text-xl tracking-[.35em]"
                placeholder="000000"
              />
            </div>
            <Button type="submit" className="w-full" disabled={googleWalletLoading}>
              {googleWalletLoading ? "Verificando…" : "Verificar y añadir a Wallet"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={googleWalletLoading}
              onClick={() => {
                setGoogleWalletLoading(true);
                void sendWalletVerification()
                  .catch((error: unknown) =>
                    toast.error("No hemos podido reenviar el código", {
                      description: error instanceof Error ? error.message : undefined,
                    }),
                  )
                  .finally(() => setGoogleWalletLoading(false));
              }}
            >
              Reenviar código
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="surface bg-sidebar p-6 text-center text-sidebar-foreground">
          <p className="text-xs uppercase tracking-wide text-sidebar-foreground/70">
            {data.organization.display_name}
          </p>
          <h1 className="font-display text-2xl font-semibold">{data.program.public_name}</h1>
          <p className="mt-4 text-xs uppercase tracking-wide text-sidebar-foreground/70">
            Tu saldo
          </p>
          <p className="metric-value text-sidebar-primary" style={{ fontSize: "3rem" }}>
            {balanceLabel}
          </p>
          <p className="text-xs text-sidebar-foreground/70">
            {data.account?.tier ? `Nivel ${data.account.tier} · ` : ""}
            {data.customer.first_name}
          </p>
          {mechanic === "stamps" ? (
            <div className="mx-auto mt-5 grid max-w-xs grid-cols-5 gap-2">
              {Array.from({ length: stampTarget }, (_, index) => (
                <span
                  key={index}
                  className={`grid aspect-square place-items-center rounded-full border-2 text-sm font-bold ${
                    index < stampBalance
                      ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground"
                      : "border-sidebar-foreground/45 text-sidebar-foreground/65"
                  }`}
                >
                  {stampIcon}
                </span>
              ))}
            </div>
          ) : null}
          {qr ? (
            <img
              src={qr}
              alt="Código QR de tu tarjeta"
              className="mx-auto mt-5 size-44 rounded-lg bg-white p-2"
            />
          ) : data.short_code ? (
            <Skeleton className="mx-auto mt-5 size-44 rounded-lg" />
          ) : null}
          {data.short_code ? (
            <p className="mt-2 font-mono text-sm tracking-[0.3em]">{data.short_code}</p>
          ) : null}
          <p className="mt-3 text-xs text-sidebar-foreground/70">
            {mechanic === "stamps"
              ? `Cada compra suma sellos. Al completar ${stampTarget}, consigues tu recompensa.`
              : ruleText(data.program.earning_mode, data.program.earning_value)}
          </p>
        </div>

        <section className="surface space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Guardar tarjeta</h2>
          <div className="grid justify-items-center gap-2">
            <Button className="h-12 w-full" onClick={() => void addToWallet("apple")}>
              Añadir a Apple Wallet
            </Button>
            <button
              type="button"
              className="rounded-full p-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              onClick={() => void addToGoogleWallet()}
              disabled={googleWalletLoading}
              aria-label={
                googleWalletLoading ? "Preparando Google Wallet" : "Añadir a Google Wallet"
              }
            >
              <img
                src="/assets/google-wallet/esES_add_to_google_wallet_add-wallet-badge.svg"
                width="199"
                height="55"
                alt="Añadir a Google Wallet"
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si el proveedor todavía no está conectado, mantendremos esta tarjeta web y mostraremos
            claramente el modo demo.
          </p>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Recompensas</h2>
          <ul className="mt-3 space-y-2">
            {data.rewards.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  {r.description ? (
                    <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {num(r.points_cost)} {mechanic === "stamps" ? "sellos" : "pts"}
                  </p>
                  {r.available ? (
                    <p className="text-sm font-medium text-emerald-600">Disponible</p>
                  ) : (
                    <p className="text-sm font-medium text-red-600">
                      Faltan {num(Math.max(r.points_cost - data.membership.balance, 0))}{" "}
                      {mechanic === "stamps" ? "sellos" : "puntos"}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {data.rewards.length === 0 ? (
              <li className="text-sm text-muted-foreground">Próximamente.</li>
            ) : null}
          </ul>
        </section>

        {data.earned_rewards?.length ? (
          <section className="surface p-5">
            <h2 className="font-display text-lg font-semibold">Premios obtenidos</h2>
            <ul className="mt-3 space-y-2">
              {data.earned_rewards.map((reward) => (
                <li
                  key={reward.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{reward.name}</p>
                    <p className="text-xs text-muted-foreground">{dateTime(reward.awarded_at)}</p>
                  </div>
                  <Badge variant={reward.status === "available" ? "default" : "secondary"}>
                    {reward.status === "available" ? "Disponible" : "Canjeada"}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Movimientos</h2>
          <ul className="mt-3 divide-y">
            {data.history.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm">{txnLabel[t.type] ?? t.type}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(t.created_at)}</p>
                </div>
                <span className="font-mono text-sm">
                  {t.points_delta >= 0 ? "+" : ""}
                  {num(t.points_delta)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
