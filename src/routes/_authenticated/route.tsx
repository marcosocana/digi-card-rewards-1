import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Área privada — Fideleo" },
      {
        name: "description",
        content: "Área privada para gestionar programas de fidelización en Fideleo.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: {
          confirmed: false,
          reset: false,
          oauth: false,
          tab: "signin",
          email: "",
          next: location.href.startsWith("/panel") ? location.href : "/panel",
        },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
