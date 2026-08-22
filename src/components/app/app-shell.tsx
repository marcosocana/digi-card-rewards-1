import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Bell,
  Bot,
  ChartNoAxesCombined,
  TicketPercent,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  UserRound,
  Users,
  Wallet,
  X,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession, type OrgRole } from "@/lib/session";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: OrgRole[];
  group: "Operaciones" | "Fidelización" | "Analítica" | "Administración";
}

const nav: NavItem[] = [
  {
    to: "/panel",
    label: "Inicio",
    icon: LayoutDashboard,
    roles: ["admin", "manager"],
    group: "Operaciones",
  },
  {
    to: "/panel/caja",
    label: "Escáner",
    icon: ScanLine,
    roles: ["admin", "manager", "staff"],
    group: "Operaciones",
  },
  {
    to: "/panel/clientes",
    label: "Clientes",
    icon: Users,
    roles: ["admin", "manager"],
    group: "Operaciones",
  },
  {
    to: "/panel/campanas",
    label: "Campañas",
    icon: Megaphone,
    roles: ["admin"],
    group: "Fidelización",
  },
  {
    to: "/panel/programa",
    label: "Programa",
    icon: Sparkles,
    roles: ["admin"],
    group: "Fidelización",
  },
  {
    to: "/panel/recompensas",
    label: "Recompensas",
    icon: Gift,
    roles: ["admin"],
    group: "Fidelización",
  },
  {
    to: "/panel/beneficios",
    label: "Cupones y regalo",
    icon: TicketPercent,
    roles: ["admin"],
    group: "Fidelización",
  },
  {
    to: "/panel/notificaciones",
    label: "Notificaciones",
    icon: Bell,
    roles: ["admin"],
    group: "Fidelización",
  },
  {
    to: "/panel/automatizaciones",
    label: "Automatizaciones",
    icon: Bot,
    roles: ["admin"],
    group: "Fidelización",
  },
  {
    to: "/panel/estadisticas",
    label: "Estadísticas",
    icon: ChartNoAxesCombined,
    roles: ["admin"],
    group: "Analítica",
  },
  {
    to: "/panel/captacion",
    label: "Captación",
    icon: BarChart3,
    roles: ["admin", "manager"],
    group: "Analítica",
  },
  {
    to: "/panel/tienda",
    label: "Tienda",
    icon: ShoppingBag,
    roles: ["admin", "manager"],
    group: "Analítica",
  },
  {
    to: "/panel/actividad",
    label: "Actividad",
    icon: Settings2,
    roles: ["admin"],
    group: "Analítica",
  },
  {
    to: "/panel/establecimientos",
    label: "Establecimientos",
    icon: Building2,
    roles: ["admin"],
    group: "Administración",
  },
  {
    to: "/panel/equipo",
    label: "Equipo",
    icon: ShieldCheck,
    roles: ["admin"],
    group: "Administración",
  },
  { to: "/panel/wallet", label: "Wallet", icon: Wallet, roles: ["admin"], group: "Administración" },
  {
    to: "/panel/configuracion",
    label: "Configuración",
    icon: Settings2,
    roles: ["admin"],
    group: "Administración",
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const role = session?.org?.role ?? "staff";
  const items =
    session?.isSuperadmin && !session.org ? [] : nav.filter((i) => i.roles.includes(role));
  const roleName = session?.isSuperadmin ? "Superadmin" : role;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (to: string) =>
    to === "/panel" ? pathname === "/panel" : pathname.startsWith(to);

  const groups = ["Operaciones", "Fidelización", "Analítica", "Administración"] as const;
  const searchResults = search.trim()
    ? items
        .filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <div>
          <Link
            to="/panel"
            className="flex items-center gap-2.5"
            aria-label="Fideleo, inicio del panel"
          >
            <img src="/isotipo.svg" alt="" width={30} height={30} className="size-7" />
            <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-6 w-auto" />
          </Link>
          <p className="mt-1 text-xs text-sidebar-foreground/55">
            {session?.organizationName ?? "Sin organización"}
          </p>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.13em] text-sidebar-foreground/40">
                {group}
              </p>
              <div className="space-y-1">
                {groupItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive(item.to)
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon aria-hidden className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {session?.isSuperadmin ? (
          <Link
            to="/plataforma"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-3 flex items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5 text-sm",
              pathname.startsWith("/plataforma")
                ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <ShieldCheck aria-hidden className="size-4 shrink-0" />
            Plataforma
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-4">
        <Link
          to="/panel/perfil"
          onClick={() => setOpen(false)}
          className="block rounded-lg px-2 py-1 hover:bg-sidebar-accent"
        >
          <p className="truncate text-sm font-medium">{session?.fullName ?? session?.email}</p>
          <p className="text-xs capitalize text-sidebar-foreground/70">Ver perfil · {roleName}</p>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut aria-hidden className="size-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden lg:block lg:h-screen lg:sticky lg:top-0">{sidebar}</aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <Link
          to="/panel"
          className="flex items-center gap-2"
          aria-label="Fideleo, inicio del panel"
        >
          <img src="/isotipo.svg" alt="" width={26} height={26} className="size-6" />
          <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-5 w-auto" />
        </Link>
        <span className="w-5" />
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 hidden h-18 items-center justify-between border-b bg-card/95 px-8 backdrop-blur lg:flex">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar una sección de Fideleo"
              className="h-10 w-full rounded-xl border bg-muted/50 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/10"
            />
            {searchResults.length ? (
              <div className="absolute inset-x-0 top-12 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl">
                {searchResults.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSearch("")}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="ml-6 flex items-center gap-2">
            <Button asChild variant="ghost" className="h-auto gap-3 rounded-full py-1 pl-2 pr-3">
              <Link to="/panel/perfil" aria-label="Abrir perfil">
                <span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                  {(session?.fullName ?? session?.email ?? "F").slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-left xl:block">
                  <span className="block text-sm font-semibold leading-tight">
                    {session?.fullName ?? "Mi perfil"}
                  </span>
                  <span className="block text-xs capitalize text-muted-foreground">{roleName}</span>
                </span>
                <UserRound className="size-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl space-y-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
