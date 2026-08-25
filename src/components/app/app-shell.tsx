import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Bell,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  TicketPercent,
  ScanLine,
  Settings2,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Languages,
  MapPin,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Users,
  Wallet,
  X,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n, type Language } from "@/lib/i18n";
import {
  setSelectedLocationIds,
  useSession,
  type OrgRole,
  type SessionLocation,
} from "@/lib/session";

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
    to: "/panel/tienda",
    label: "Tienda",
    icon: ShoppingBag,
    roles: ["admin", "manager"],
    group: "Operaciones",
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
    label: "Usuarios",
    icon: ShieldCheck,
    roles: ["admin"],
    group: "Administración",
  },
  {
    to: "/panel/wallet",
    label: "Wallet",
    icon: Wallet,
    roles: ["admin"],
    group: "Administración",
  },
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
  const [collapsed, setCollapsed] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedLocationScope, setSelectedLocationScope] = useState("all");
  const initializedLocations = useRef<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const { language, setLanguage, t } = useI18n();

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("fideleo:sidebar-collapsed") === "true");
    const dark = window.localStorage.getItem("fideleo:theme") === "dark";
    setDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    if (!session) return;
    const locationKey = `${session.userId}:${session.locations.map((location) => location.id).join(",")}`;
    if (initializedLocations.current === locationKey) return;
    initializedLocations.current = locationKey;
    const initialSelection = session.locations.length === 1 ? [session.locations[0].id] : [];
    setSelectedLocations(initialSelection);
    setSelectedLocationScope(
      initialSelection.length === 1 ? `location:${initialSelection[0]}` : "all",
    );
    setSelectedLocationIds(initialSelection);
  }, [session]);

  useEffect(() => {
    if (!session?.locations.length || !selectedLocations.length) return;
    const allowed = new Set(session.locations.map((location) => location.id));
    const valid = selectedLocations.filter((id) => allowed.has(id));
    if (valid.length !== selectedLocations.length) {
      setSelectedLocations(valid);
      setSelectedLocationScope(valid.length === 1 ? `location:${valid[0]}` : "all");
      setSelectedLocationIds(valid);
    }
  }, [selectedLocations, session?.locations]);

  const role = session?.isSuperadmin ? "admin" : (session?.org?.role ?? "staff");
  const items = nav.filter((i) => i.roles.includes(role));
  const roleName = t(session?.isSuperadmin ? "Superadmin" : role);

  const updateLocations = (scope: string, ids: string[]) => {
    setSelectedLocationScope(scope);
    setSelectedLocations(ids);
    setSelectedLocationIds(ids);
  };

  const organizationGroups = Array.from(
    (session?.locations ?? []).reduce((groups, location) => {
      if (!location.organizationId) return groups;
      const current = groups.get(location.organizationId) ?? {
        id: location.organizationId,
        name: location.organizationName ?? "Club sin nombre",
        locations: [],
      };
      current.locations.push(location);
      groups.set(location.organizationId, current);
      return groups;
    }, new Map<string, { id: string; name: string; locations: SessionLocation[] }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const selectedOrganization = selectedLocationScope.startsWith("organization:")
    ? organizationGroups.find(
        (group) => group.id === selectedLocationScope.replace("organization:", ""),
      )
    : null;
  const selectedLocationLabel = selectedOrganization
    ? `Club · ${selectedOrganization.name}`
    : !selectedLocations.length
      ? t("Todos los locales")
      : selectedLocations.length === 1
        ? (() => {
            const location = session?.locations.find(
              (location) => location.id === selectedLocations[0],
            );
            return location ? formatLocationLabel(location, session?.isSuperadmin) : t("1 local");
          })()
        : t("{count} locales", { count: selectedLocations.length });

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("fideleo:sidebar-collapsed", String(next));
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("fideleo:theme", next ? "dark" : "light");
  };

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
        .filter((item) =>
          `${item.label} ${t(item.label)}`.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="relative border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2">
          <Link
            to="/panel/perfil"
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent",
              collapsed && "lg:justify-center",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {(session?.fullName ?? session?.email ?? "F").slice(0, 2).toUpperCase()}
            </span>
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="block truncate text-sm font-semibold">
                {session?.fullName ?? session?.email ?? t("Mi perfil")}
              </span>
              <span className="block truncate text-xs capitalize text-sidebar-foreground/55">
                {roleName}
              </span>
            </span>
          </Link>
        </div>

        {session?.locations.length && session.locations.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "mt-3 w-full justify-between border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed && "lg:justify-center lg:px-2",
                )}
              >
                <MapPin className="size-4 shrink-0" />
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  {selectedLocationLabel}
                </span>
                <ChevronDown className={cn("size-4 opacity-55", collapsed && "lg:hidden")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-[min(70vh,32rem)] w-80 overflow-y-auto"
            >
              <DropdownMenuRadioGroup
                value={selectedLocationScope}
                onValueChange={(scope) => {
                  if (scope === "all") return updateLocations("all", []);
                  if (scope.startsWith("organization:")) {
                    const organizationId = scope.replace("organization:", "");
                    const group = organizationGroups.find((item) => item.id === organizationId);
                    return updateLocations(
                      scope,
                      group?.locations.map((location) => location.id) ?? [],
                    );
                  }
                  updateLocations(scope, [scope.replace("location:", "")]);
                }}
              >
                <DropdownMenuRadioItem value="all">{t("Todos los locales")}</DropdownMenuRadioItem>
                {session.isSuperadmin
                  ? organizationGroups.map((group) => (
                      <div key={group.id}>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioItem
                          value={`organization:${group.id}`}
                          className="font-semibold"
                        >
                          <Building2 className="size-4" />
                          Club · {group.name}
                        </DropdownMenuRadioItem>
                        <DropdownMenuLabel className="pb-1 pl-8 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Establecimientos
                        </DropdownMenuLabel>
                        {group.locations.map((location) => (
                          <DropdownMenuRadioItem
                            key={location.id}
                            value={`location:${location.id}`}
                            className="pl-11"
                          >
                            {location.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </div>
                    ))
                  : session.locations.map((location) => (
                      <DropdownMenuRadioItem key={location.id} value={`location:${location.id}`}>
                        {location.name}
                      </DropdownMenuRadioItem>
                    ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : session?.locations.length === 1 ? (
          <p
            className={cn(
              "mt-3 flex items-center gap-2 px-2 text-xs text-sidebar-foreground/55",
              collapsed && "lg:justify-center",
            )}
          >
            <MapPin className="size-4 shrink-0" />
            <span className={cn("truncate", collapsed && "lg:hidden")}>
              {formatLocationLabel(session.locations[0], session.isSuperadmin)}
            </span>
          </p>
        ) : null}
        <button
          className="absolute right-3 top-3 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label={t("Cerrar menú")}
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          return (
            <div key={group} className="mb-5">
              {group === "Operaciones" ? null : (
                <p
                  className={cn(
                    "mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.13em] text-sidebar-foreground/40",
                    collapsed && "lg:hidden",
                  )}
                >
                  {t(group)}
                </p>
              )}
              <div className="space-y-1">
                {groupItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    title={collapsed ? t(item.label) : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      collapsed && "lg:justify-center lg:px-2",
                      isActive(item.to)
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon aria-hidden className="size-4 shrink-0" />
                    <span className={cn(collapsed && "lg:hidden")}>{t(item.label)}</span>
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
              collapsed && "lg:justify-center lg:px-2",
              pathname.startsWith("/plataforma")
                ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <ShieldCheck aria-hidden className="size-4 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>{t("Plataforma")}</span>
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent",
            collapsed && "lg:justify-center",
          )}
          onClick={signOut}
          title={t("Cerrar sesión")}
        >
          <LogOut aria-hidden className="size-4" />
          <span className={cn(collapsed && "lg:hidden")}>{t("Cerrar sesión")}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background lg:grid",
        collapsed ? "lg:grid-cols-[4.75rem_1fr]" : "lg:grid-cols-[15rem_1fr]",
      )}
    >
      <aside className="hidden lg:block lg:h-screen lg:sticky lg:top-0">{sidebar}</aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-card px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(true)} aria-label={t("Abrir menú")}>
            <Menu className="size-5" />
          </button>
          <Link to="/panel" onClick={() => setOpen(false)} aria-label="Fideleo">
            <img
              src="/isotipo.svg"
              alt="Fideleo"
              width={121}
              height={121}
              className="size-9 dark:hidden"
            />
            <img
              src="/isotipo-dark.svg"
              alt="Fideleo"
              width={121}
              height={121}
              className="hidden size-9 dark:block"
            />
          </Link>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("Cambiar tema")}>
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("Ayuda")}>
                <CircleHelp className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("¿Necesitas ayuda?")}</DialogTitle>
                <DialogDescription>
                  {t("Ponte en contacto con el equipo de Fideleo y te ayudaremos con tu cuenta.")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="outline" className="h-auto justify-start py-4">
                  <a href="mailto:fideleo.app@gmail.com">
                    <span className="text-left">
                      <span className="block text-xs text-muted-foreground">Email</span>
                      <span className="block">fideleo.app@gmail.com</span>
                    </span>
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-auto justify-start py-4">
                  <a href="https://wa.me/34695834018" target="_blank" rel="noopener noreferrer">
                    <span className="text-left">
                      <span className="block text-xs text-muted-foreground">WhatsApp</span>
                      <span className="block">695 83 40 18</span>
                    </span>
                  </a>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger
              className="size-9 justify-center border-0 px-0 shadow-none [&>svg:last-child]:hidden"
              aria-label={t("Seleccionar idioma")}
              title={t("Seleccionar idioma")}
            >
              <Languages className="size-4" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="ca">Català</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 hidden h-18 items-center justify-between border-b bg-card/95 px-8 backdrop-blur lg:flex">
          <div className="flex w-full max-w-2xl items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={toggleSidebar}
              aria-label={t(collapsed ? "Mostrar textos del menú" : "Ocultar textos del menú")}
              title={t(collapsed ? "Mostrar menú" : "Contraer menú")}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar una sección de Fideleo")}
                className="h-10 w-full rounded-xl border bg-muted/50 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/10"
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
                      {t(item.label)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="ml-6 flex items-center gap-2">
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="w-[8.5rem]" aria-label={t("Seleccionar idioma")}>
                <Languages className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="ca">Català</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("Ayuda")}>
                  <CircleHelp className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("¿Necesitas ayuda?")}</DialogTitle>
                  <DialogDescription>
                    {t("Ponte en contacto con el equipo de Fideleo y te ayudaremos con tu cuenta.")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-auto justify-start py-4">
                    <a href="mailto:fideleo.app@gmail.com">
                      <span className="text-left">
                        <span className="block text-xs text-muted-foreground">Email</span>
                        <span className="block">fideleo.app@gmail.com</span>
                      </span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto justify-start py-4">
                    <a href="https://wa.me/34695834018" target="_blank" rel="noopener noreferrer">
                      <span className="text-left">
                        <span className="block text-xs text-muted-foreground">WhatsApp</span>
                        <span className="block">695 83 40 18</span>
                      </span>
                    </a>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={t(darkMode ? "Activar modo claro" : "Activar modo oscuro")}
              title={t(darkMode ? "Modo claro" : "Modo oscuro")}
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
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

function formatLocationLabel(
  location: { name: string; organizationName?: string },
  includeOrganization = false,
) {
  return includeOrganization && location.organizationName
    ? `${location.organizationName} · ${location.name}`
    : location.name;
}
