import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { JoinForm } from "@/components/app/join-form";

export const Route = createFileRoute("/unirme/$organizationSlug/")({
  head: () => ({
    meta: [
      { title: "Únete al programa de fidelización" },
      { name: "description", content: "Regístrate y consigue puntos por cada compra, con tu tarjeta en Wallet." },
      { property: "og:title", content: "Únete al programa de fidelización" },
      { property: "og:description", content: "Puntos por cada compra y recompensas, sin instalar ninguna app." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const params = Route.useParams() as { organizationSlug: string; locationSlug?: string };

  const { data, isLoading } = useQuery({
    queryKey: ["join", params.organizationSlug, params.locationSlug ?? null],
    queryFn: async () => {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, display_name")
        .eq("slug", params.organizationSlug)
        .maybeSingle();
      if (!org) return null;
      const { data: program } = await supabase
        .from("loyalty_programs")
        .select("id, public_name, description, earning_mode, earning_value, terms")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!program) return null;
      let location: { id: string; name: string } | null = null;
      if (params.locationSlug) {
        const { data: loc } = await supabase
          .from("locations")
          .select("id, name")
          .eq("organization_id", org.id)
          .eq("slug", params.locationSlug)
          .maybeSingle();
        location = loc ?? null;
      }
      return { organization: org, program, location };
    },
  });

  return (
    <main className="min-h-screen bg-secondary px-5 py-12">
      <div className="mx-auto w-full max-w-lg space-y-5">
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : !data ? (
          <div className="surface p-8 text-center">
            <h1 className="font-display text-xl font-semibold">Programa no disponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">Revisa el enlace o pregunta en el establecimiento.</p>
          </div>
        ) : (
          <>
            <header className="text-center">
              <p className="text-sm font-medium text-muted-foreground">{data.organization.display_name}</p>
              <h1 className="mt-1 font-display text-3xl font-semibold">{data.program.public_name}</h1>
              {data.program.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{data.program.description}</p>
              ) : null}
              {data.location ? (
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{data.location.name}</p>
              ) : null}
            </header>
            <JoinForm ctx={data} />
            {data.program.terms ? (
              <p className="px-2 text-xs text-muted-foreground">{data.program.terms}</p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
