import { createFileRoute } from "@tanstack/react-router";
import { PublicClubExperience } from "@/components/app/public-club-experience";

export const Route = createFileRoute("/unirme/$organizationSlug/")({
  head: () => ({
    meta: [
      { title: "Únete al programa de fidelización" },
      {
        name: "description",
        content: "Regístrate, verifica tu email y consigue tu tarjeta digital.",
      },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { organizationSlug } = Route.useParams();
  return <PublicClubExperience organizationSlug={organizationSlug} />;
}
