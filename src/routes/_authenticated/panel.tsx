import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated/panel")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
