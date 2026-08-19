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
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
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
}

const nav: NavItem[] = [
  { to: "/panel", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { to: "/panel/caja", label: "Escáner", icon: ScanLine, roles: ["admin", "manager", "staff"] },
  { to: "/panel/clientes", label: "Clientes", icon: Users, roles: ["admin", "manager"] },
  { to: "/panel/campanas", label: "Campañas", icon: Megaphone, roles: ["admin"] },
  { to: "/panel/programa", label: "Programa", icon: Sparkles, roles: ["admin"] },
  { to: "/panel/recompensas", label: "Recompensas", icon: Gift, roles: ["admin"] },
  { to: "/panel/establecimientos", label: "Establecimientos", icon: Building2, roles: ["admin"] },
  { to: "/panel/equipo", label: "Equipo", icon: ShieldCheck, roles: ["admin"] },
  { to: "/panel/captacion", label: "Captación", icon: BarChart3, roles: ["admin", "manager"] },
  { to: "/panel/wallet", label: "Wallet", icon: Wallet, roles: ["admin"] },
  { to: "/panel/actividad", label: "Actividad", icon: Settings2, roles: ["admin"] },
  { to: "/panel/configuracion", label: "Configuración", icon: Settings2, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

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

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="font-display text-lg font-semibold">Puntia</p>
          <p className="text-xs text-sidebar-foreground/70">
            {session?.organizationName ?? "Sin organización"}
          </p>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              isActive(item.to)
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <item.icon aria-hidden className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
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
        <p className="truncate text-sm font-medium">{session?.fullName ?? session?.email}</p>
        <p className="text-xs capitalize text-sidebar-foreground/70">{roleName}</p>
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
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block lg:h-screen lg:sticky lg:top-0">{sidebar}</aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-card px-4 py-3">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <span className="font-display font-semibold">Puntia</span>
        <span className="w-5" />
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">{sidebar}</div>
        </div>
      ) : null}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
