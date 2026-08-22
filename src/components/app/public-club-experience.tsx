import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { JoinForm } from "@/components/app/join-form";

export function PublicClubExperience({
  organizationSlug,
  locationSlug,
}: {
  organizationSlug: string;
  locationSlug?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["public-club-experience", organizationSlug, locationSlug ?? null],
    queryFn: async () => {
      const { data: organization, error } = await supabase
        .from("organizations")
        .select("id, display_name, slug, contact_email, contact_phone, organization_branding(*)")
        .eq("slug", organizationSlug)
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
      let location: { id: string; name: string } | null = null;
      if (locationSlug) {
        const { data } = await supabase
          .from("locations")
          .select("id, name")
          .eq("organization_id", organization.id)
          .eq("slug", locationSlug)
          .eq("status", "active")
          .maybeSingle();
        location = data ?? null;
      }
      return {
        organization,
        program,
        branding: organization.organization_branding,
        location,
      };
    },
  });

  if (isLoading)
    return (
      <main className="min-h-screen bg-neutral-100 p-4">
        <Skeleton className="mx-auto h-[52rem] max-w-2xl rounded-[2rem]" />
      </main>
    );
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-100 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Club no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Revisa el enlace o pregunta en el establecimiento.
          </p>
        </div>
      </main>
    );

  const branding = data.branding;
  const primary = branding?.primary_color || "#111111";
  const secondary = branding?.secondary_color || "#f8b9e7";
  const background = branding?.background_color || "#f5f5f4";
  const text = branding?.text_color || "#111111";

  return (
    <main className="min-h-screen" style={{ backgroundColor: background, color: text }}>
      <section className="relative min-h-[28rem] overflow-hidden">
        {branding?.cover_url ? (
          <img
            src={branding.cover_url}
            alt={`Portada de ${data.organization.display_name}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/70" />
        <div className="relative mx-auto flex min-h-[28rem] max-w-5xl flex-col items-center justify-end px-5 pb-12 text-center text-white">
          {branding?.logo_url ? (
            <div className="mb-6 grid min-h-24 min-w-24 place-items-center rounded-2xl bg-white p-4 shadow-2xl">
              <img
                src={branding.logo_url}
                alt={`Logo de ${data.organization.display_name}`}
                className="max-h-20 max-w-48 object-contain"
              />
            </div>
          ) : (
            <div className="mb-6 grid size-24 place-items-center rounded-2xl bg-white/95 text-3xl font-black text-black shadow-2xl">
              {data.organization.display_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {data.location ? (
            <p className="mb-3 rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] backdrop-blur">
              {data.location.name}
            </p>
          ) : null}
          <h1 className="max-w-3xl text-4xl font-semibold leading-[.95] tracking-[-.05em] sm:text-6xl">
            {branding?.welcome_message || data.program.public_name}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {branding?.program_description ||
              data.program.description ||
              `Únete al club de ${data.organization.display_name} y convierte cada visita en una recompensa.`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-xl px-4 py-8 lg:py-12">
        <JoinForm
          ctx={{
            organization: data.organization,
            program: data.program,
            location: data.location,
            primaryColor: primary,
          }}
        />
      </div>

      <footer className="border-t border-black/10 px-5 py-8 text-center text-xs opacity-65">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          <Link
            to="/club/$businessSlug/legal/$document"
            params={{ businessSlug: organizationSlug, document: "terminos" }}
          >
            Términos y condiciones
          </Link>
          <Link
            to="/club/$businessSlug/legal/$document"
            params={{ businessSlug: organizationSlug, document: "privacidad" }}
          >
            Privacidad
          </Link>
          <Link
            to="/club/$businessSlug/legal/$document"
            params={{ businessSlug: organizationSlug, document: "aviso-legal" }}
          >
            Aviso legal
          </Link>
          <Link
            to="/club/$businessSlug/legal/$document"
            params={{ businessSlug: organizationSlug, document: "cookies" }}
          >
            Cookies
          </Link>
        </div>
        <p className="mt-4">
          Programa gestionado con <strong>Fideleo</strong>
        </p>
      </footer>
    </main>
  );
}
