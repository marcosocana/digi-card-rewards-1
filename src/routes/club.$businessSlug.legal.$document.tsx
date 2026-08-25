import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LegalDocumentLayout, type LegalDocumentType } from "@/components/app/legal-document";
import { PageSkeleton } from "@/components/app/brand-loader";

export const Route = createFileRoute("/club/$businessSlug/legal/$document")({
  head: () => ({
    meta: [
      { title: "Información legal del club de fidelización" },
      {
        name: "description",
        content: "Consulta las condiciones, privacidad y avisos legales del club de fidelización.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubLegalPage,
});
const allowed = new Set(["terminos", "privacidad", "aviso-legal", "cookies"]);

function ClubLegalPage() {
  const { businessSlug, document } = Route.useParams();
  const type = (allowed.has(document) ? document : "aviso-legal") as LegalDocumentType;
  const { data, isLoading } = useQuery({
    queryKey: ["club-legal", businessSlug],
    queryFn: async () => {
      const { data: organization } = await supabase
        .from("organizations")
        .select(
          "id, display_name, legal_name, tax_id, registry_details, contact_email, contact_phone, address_line, postal_code, city, organization_branding(legal_notice, privacy_policy, cookie_policy)",
        )
        .eq("slug", businessSlug)
        .maybeSingle();
      if (!organization) return null;
      const { data: program } = await supabase
        .from("loyalty_programs")
        .select("terms")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return { organization, program };
    },
  });
  if (isLoading)
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-6 sm:p-10">
          <PageSkeleton variant="form" />
        </div>
      </main>
    );
  if (!data) return <main className="p-10 text-center">Documento no disponible.</main>;
  const branding = data.organization.organization_branding;
  const customText =
    type === "privacidad"
      ? branding?.privacy_policy
      : type === "aviso-legal"
        ? branding?.legal_notice
        : type === "cookies"
          ? branding?.cookie_policy
          : null;
  return (
    <LegalDocumentLayout
      type={type}
      backTo={`/club/${businessSlug}`}
      isCustomer
      customText={customText}
      programTerms={data.program?.terms}
      entity={{
        name: data.organization.display_name,
        legalName: data.organization.legal_name,
        taxId: data.organization.tax_id,
        registryDetails: data.organization.registry_details,
        email: data.organization.contact_email,
        phone: data.organization.contact_phone,
        address: [
          data.organization.address_line,
          data.organization.postal_code,
          data.organization.city,
        ]
          .filter(Boolean)
          .join(", "),
      }}
    />
  );
}
