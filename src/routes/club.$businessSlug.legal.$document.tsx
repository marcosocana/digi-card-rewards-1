import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LegalDocumentLayout, type LegalDocumentType } from "@/components/app/legal-document";

export const Route = createFileRoute("/club/$businessSlug/legal/$document")({
  component: ClubLegalPage,
});
const allowed = new Set(["terminos", "privacidad", "aviso-legal", "cookies"]);

function ClubLegalPage() {
  const { businessSlug, document } = Route.useParams();
  const type = (allowed.has(document) ? document : "aviso-legal") as LegalDocumentType;
  const { data } = useQuery({
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
