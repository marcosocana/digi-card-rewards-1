import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentLayout, type LegalDocumentType } from "@/components/app/legal-document";

const legalMeta: Record<string, { title: string; description: string }> = {
  terminos: {
    title: "Términos y condiciones — Fideleo",
    description: "Consulta los términos y condiciones de uso de la plataforma Fideleo.",
  },
  privacidad: {
    title: "Política de privacidad — Fideleo",
    description: "Información sobre el tratamiento y la protección de datos personales en Fideleo.",
  },
  "aviso-legal": {
    title: "Aviso legal — Fideleo",
    description: "Información legal e identificativa del servicio digital Fideleo.",
  },
  cookies: {
    title: "Política de cookies — Fideleo",
    description: "Consulta qué cookies utiliza Fideleo y cómo puedes configurar tus preferencias.",
  },
};

export const Route = createFileRoute("/legal/$document")({
  head: ({ params }) => {
    const meta = legalMeta[params.document] ?? legalMeta["aviso-legal"];
    return {
      meta: [{ title: meta.title }, { name: "description", content: meta.description }],
    };
  },
  component: MainLegalPage,
});

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
