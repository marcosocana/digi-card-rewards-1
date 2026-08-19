import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, QrCode, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Puntia — Acceso a la plataforma de fidelización" },
      {
        name: "description",
        content:
          "Accede al backoffice de Puntia para gestionar programas de puntos, recompensas y tarjetas en Apple Wallet y Google Wallet.",
      },
      { property: "og:title", content: "Puntia — Acceso a la plataforma" },
      {
        property: "og:description",
        content: "Backoffice de fidelización para comercios: puntos, recompensas y tarjetas Wallet.",
      },
    ],
  }),
  component: Index,
});

const pillars = [
  { icon: QrCode, title: "Captación por QR", text: "QR públicos por establecimiento y origen." },
  { icon: CreditCard, title: "Tarjeta en Wallet", text: "Apple Wallet y Google Wallet, sin app." },
  { icon: ScanLine, title: "Caja en 10 segundos", text: "Escanear, importe y confirmar." },
  { icon: ShieldCheck, title: "Ledger auditable", text: "Ningún saldo cambia sin movimiento." },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-16">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
          Plataforma interna · MVP 1.0
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
          Fidelización con tarjeta en Wallet para comercios físicos.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Programas de puntos por gasto, recompensas y trazabilidad completa. Multiempresa y
          multiestablecimiento desde el primer día.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Entrar al backoffice</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/unirme/$organizationSlug" params={{ organizationSlug: "cafe-norte" }}>
              Ver landing de ejemplo
            </Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="surface p-5">
              <p.icon aria-hidden className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
