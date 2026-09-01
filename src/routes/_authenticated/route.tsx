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
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      const requestedPath = `${location.pathname}${location.searchStr}${location.hash}`;
      throw redirect({
        to: "/auth",
        search: {
          confirmed: false,
          reset: false,
          oauth: false,
          tab: "signin",
          email: "",
          next: requestedPath.startsWith("/panel") ? requestedPath : "/panel",
        },
      });
    }
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
