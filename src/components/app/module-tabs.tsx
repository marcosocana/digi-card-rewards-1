import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type ModuleTab = {
  label: string;
  to:
    | "/panel/programa"
    | "/panel/recompensas"
    | "/panel/captacion"
    | "/panel/wallet"
    | "/panel/notificaciones"
    | "/panel/automatizaciones";
};

export function ModuleTabs({ tabs }: { tabs: ModuleTab[] }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      className="mb-5 flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit"
      aria-label="Secciones relacionadas"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            pathname === tab.to
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export const loyaltyModuleTabs: ModuleTab[] = [
  { label: "Programa", to: "/panel/programa" },
  { label: "Recompensas", to: "/panel/recompensas" },
  { label: "Página de captación", to: "/panel/captacion" },
  { label: "Wallet", to: "/panel/wallet" },
];

export const communicationsModuleTabs: ModuleTab[] = [
  { label: "Notificaciones", to: "/panel/notificaciones" },
  { label: "Automatizaciones", to: "/panel/automatizaciones" },
];
