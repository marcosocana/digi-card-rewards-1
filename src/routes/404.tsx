import { createFileRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/components/app/not-found-page";

export const Route = createFileRoute("/404")({
  head: () => ({
    meta: [
      { title: "Página no encontrada — Fideleo" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotFoundPage,
});
