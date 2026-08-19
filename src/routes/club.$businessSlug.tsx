import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, ShieldCheck, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { JoinForm } from "@/components/app/join-form";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/club/$businessSlug")({
  head: () => ({
    meta: [
      { title: "Club de fidelización" },
      {
        name: "description",
        content: "Únete al club y guarda tu tarjeta digital sin instalar ninguna aplicación.",
      },
    ],
  }),
  component: ClubPage,
});

function ClubPage() {
  const { businessSlug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-club", businessSlug],
    queryFn: async () => {
      const { data: organization, error } = await supabase
        .from("organizations")
        .select("id, display_name, contact_phone, slug, organization_branding(*)")
        .eq("slug", businessSlug)
        .eq("status", "active")
        .maybeSingle();
      if (error || !organization) return null;
      const { data: program } = await supabase
        .from("loyalty_programs")
        .select("id, public_name, description, earning_mode, earning_value, terms")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!program) return null;
      const { data: reward } = await supabase
        .from("rewards")
        .select("name, description, points_cost")
        .eq("program_id", program.id)
        .eq("status", "active")
        .order("points_cost")
        .limit(1)
        .maybeSingle();
      return { organization, program, reward, branding: organization.organization_branding };
    },
  });

  if (isLoading)
    return (
      <main className="mx-auto max-w-lg p-5">
        <Skeleton className="h-[42rem] rounded-2xl" />
      </main>
    );
  if (!data)
    return (
      <main className="p-10 text-center text-sm text-muted-foreground">
        Este club no está disponible.
      </main>
    );
  const branding = data.branding;
  return (
    <main
      className="min-h-screen px-4 py-8 sm:py-12"
      style={{ backgroundColor: branding?.background_color, color: branding?.text_color }}
    >
      <div className="mx-auto w-full max-w-lg space-y-5">
        <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {branding?.cover_url ? (
            <img src={branding.cover_url} alt="" className="h-44 w-full object-cover" />
          ) : null}
          <div className="p-6 text-center">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={`Logo de ${data.organization.display_name}`}
                className="mx-auto mb-4 size-16 rounded-xl object-contain"
              />
            ) : null}
            <p className="text-sm font-medium text-muted-foreground">
              {data.organization.display_name}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">
              {branding?.welcome_message || data.program.public_name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{data.program.description}</p>
            {data.reward ? (
              <div className="mt-5 rounded-xl bg-secondary p-4">
                <Gift className="mx-auto size-5 text-primary" />
                <p className="mt-2 font-medium">Tu próximo premio: {data.reward.name}</p>
                <p className="text-xs text-muted-foreground">
                  Consíguelo al alcanzar {data.reward.points_cost} puntos
                </p>
              </div>
            ) : null}
          </div>
        </header>
        <JoinForm
          ctx={{ organization: data.organization, program: data.program, location: null }}
        />
        <div className="grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground">
          <div className="rounded-xl border bg-card p-3">
            <Smartphone className="mx-auto mb-1 size-4" />
            Sin instalar una app
          </div>
          <div className="rounded-xl border bg-card p-3">
            <ShieldCheck className="mx-auto mb-1 size-4" />
            QR sin datos personales
          </div>
        </div>
        {data.program.terms ? (
          <details className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Condiciones del programa
            </summary>
            <p className="mt-3 whitespace-pre-wrap">{data.program.terms}</p>
          </details>
        ) : null}
      </div>
    </main>
  );
}
