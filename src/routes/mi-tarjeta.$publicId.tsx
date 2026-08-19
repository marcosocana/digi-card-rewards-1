import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  const balanceLabel =
    mechanic === "cashback"
      ? eur(data.membership.balance)
      : mechanic === "stamps"
        ? `${num(data.membership.balance)} sellos`
        : mechanic === "spend"
          ? `${num(data.membership.balance)} € acumulados`
          : `${num(data.membership.balance)} puntos`;

  return (
    <main className="min-h-screen bg-secondary px-5 py-10">
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
          {qr ? (
            <img
              src={qr}
              alt="Código QR de tu tarjeta"
              className="mx-auto mt-5 size-44 rounded-lg bg-white p-2"
            />
          ) : null}
          {data.short_code ? (
            <p className="mt-2 font-mono text-sm tracking-[0.3em]">{data.short_code}</p>
          ) : null}
          <p className="mt-3 text-xs text-sidebar-foreground/70">
            {ruleText(data.program.earning_mode, data.program.earning_value)}
          </p>
        </div>

        <section className="surface space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Guardar tarjeta</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => void addToWallet("apple")}>Añadir a Apple Wallet</Button>
            <Button variant="outline" onClick={() => void addToWallet("google")}>
              Añadir a Google Wallet
            </Button>
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
                <Badge variant={r.available ? "default" : "outline"}>
                  {num(r.points_cost)} pts
                </Badge>
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
