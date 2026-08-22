import { createFileRoute } from "@tanstack/react-router";
import { PublicClubExperience } from "@/components/app/public-club-experience";

export const Route = createFileRoute("/club/$businessSlug")({
  head: () => ({
    meta: [
      { title: "Club de fidelización" },
      {
        name: "description",
        content: "Únete al club y recibe tu tarjeta digital después de verificar tu email.",
      },
    ],
  }),
  component: ClubPage,
});

function ClubPage() {
  const { businessSlug } = Route.useParams();
  return <PublicClubExperience organizationSlug={businessSlug} />;
}
