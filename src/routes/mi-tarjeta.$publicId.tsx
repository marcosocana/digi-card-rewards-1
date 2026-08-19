import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getMembershipPortal } from "@/lib/operations";
import { qrPngDataUrl } from "@/lib/qr";
import { dateTime, num, ruleText, txnLabel } from "@/lib/format";

export const Route = createFileRoute("/mi-tarjeta/$publicId")({
  head: () => ({
    meta: [
      { title: "Mi tarjeta de fidelización" },
      { name: "description", content: "Consulta tus puntos, recompensas disponibles y movimientos recientes." },
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

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full rounded-xl" /></div>;
  if (!data) return <main className="p-10 text-center text-sm text-muted-foreground">Tarjeta no encontrada.</main>;

  return (
    <main className="min-h-screen bg-secondary px-5 py-10">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="surface bg-sidebar p-6 text-center text-sidebar-foreground">
          <p className="text-xs uppercase tracking-wide text-sidebar-foreground/70">{data.organization.display_name}</p>
          <h1 className="font-display text-2xl font-semibold">{data.program.public_name}</h1>
          <p className="mt-4 text-xs uppercase tracking-wide text-sidebar-foreground/70">Tu saldo</p>
          <p className="metric-value text-sidebar-primary" style={{ fontSize: "3rem" }}>{num(data.membership.balance)}</p>
          <p className="text-xs text-sidebar-foreground/70">puntos · {data.customer.first_name}</p>
          {qr ? <img src={qr} alt="Código QR de tu tarjeta" className="mx-auto mt-5 size-44 rounded-lg bg-white p-2" /> : null}
          {data.short_code ? <p className="mt-2 font-mono text-sm tracking-[0.3em]">{data.short_code}</p> : null}
          <p className="mt-3 text-xs text-sidebar-foreground/70">
            {ruleText(data.program.earning_mode, data.program.earning_value)}
          </p>
        </div>

        <section className="surface p-5">
          <h2 className="font-display text-lg font-semibold">Recompensas</h2>
          <ul className="mt-3 space-y-2">
            {data.rewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  {r.description ? <p className="truncate text-xs text-muted-foreground">{r.description}</p> : null}
                </div>
                <Badge variant={r.available ? "default" : "outline"}>{num(r.points_cost)} pts</Badge>
              </li>
            ))}
            {data.rewards.length === 0 ? <li className="text-sm text-muted-foreground">Próximamente.</li> : null}
          </ul>
        </section>

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
