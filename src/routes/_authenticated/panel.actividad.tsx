import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/panel/actividad")({
  beforeLoad: () => {
    throw redirect({ to: "/panel/estadisticas" });
  },
});
