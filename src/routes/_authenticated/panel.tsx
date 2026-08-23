import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { SubscriptionGate } from "@/components/app/subscription-gate";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/panel")({
  component: PanelLayout,
});

function PanelLayout() {
  const { data: session } = useSession();
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
