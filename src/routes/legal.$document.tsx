import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentLayout, type LegalDocumentType } from "@/components/app/legal-document";

export const Route = createFileRoute("/legal/$document")({ component: MainLegalPage });

const allowed = new Set(["terminos", "privacidad", "aviso-legal", "cookies"]);

function MainLegalPage() {
  const { document } = Route.useParams();
  const type = (allowed.has(document) ? document : "aviso-legal") as LegalDocumentType;
  return (
    <LegalDocumentLayout
      type={type}
      backTo="/"
      entity={{
        name: "Fideleo",
        legalName: import.meta.env.VITE_FIDELEO_LEGAL_NAME || "Fideleo",
        taxId: import.meta.env.VITE_FIDELEO_TAX_ID,
        registryDetails: import.meta.env.VITE_FIDELEO_REGISTRY_DETAILS,
        email: "Fideleo.app@gmail.com",
        phone: "695 83 40 18",
        address: import.meta.env.VITE_FIDELEO_LEGAL_ADDRESS,
      }}
    />
  );
}
