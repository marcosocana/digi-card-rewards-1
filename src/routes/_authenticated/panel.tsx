import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { SubscriptionGate } from "@/components/app/subscription-gate";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BrandLoader } from "@/components/app/brand-loader";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel de gestión — Fideleo" },
      {
        name: "description",
        content: "Gestiona clientes, puntos, recompensas, establecimientos y tarjetas Wallet.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PanelLayout,
});

function PanelLayout() {
  const { data: session, isLoading } = useSession();
  if (isLoading) return <BrandLoader />;
  const blocked = Boolean(session?.org) && !session?.hasActivePlan;

  return (
    <>
      <div
        className={cn(blocked && "pointer-events-none select-none blur-[3px]")}
        aria-hidden={blocked}
      >
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
      <SubscriptionGate />
    </>
  );
}
