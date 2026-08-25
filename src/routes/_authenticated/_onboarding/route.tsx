import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_onboarding")({
  head: () => ({
    meta: [
      { title: "Alta de tu negocio — Fideleo" },
      {
        name: "description",
        content: "Configura tu negocio y publica tu programa de fidelización en Fideleo.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:h-20 sm:px-6">
          <img src="/logo.svg" alt="Fideleo" className="h-7 w-auto dark:hidden" />
          <img src="/logo-dark.svg" alt="Fideleo" className="hidden h-7 w-auto dark:block" />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
