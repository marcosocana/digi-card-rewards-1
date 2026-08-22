import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "admin" | "manager" | "staff";

export interface Membership {
  id: string;
  organization_id: string;
  role: OrgRole;
  can_adjust_points: boolean;
  full_name: string | null;
}

export interface SessionInfo {
  userId: string;
  email: string | null;
  fullName: string | null;
  isSuperadmin: boolean;
  org: Membership | null;
  organizationName: string | null;
  locations: { id: string; name: string; slug: string }[];
}

export const sessionQueryKey = ["session-info"];

export async function fetchSessionInfo(): Promise<SessionInfo | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, platform_role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: ou } = await supabase
    .from("organization_users")
    .select("id, organization_id, role, can_adjust_points, full_name, organizations(display_name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const isSuperadmin = profile?.platform_role === "superadmin";
  let locations: { id: string; name: string; slug: string }[] = [];

  if (ou) {
    if (ou.role === "admin" || isSuperadmin) {
      const { data } = await supabase
        .from("locations")
        .select("id, name, slug")
        .eq("organization_id", ou.organization_id)
        .eq("status", "active")
        .order("name");
      locations = data ?? [];
    } else {
      const { data } = await supabase
        .from("user_location_assignments")
        .select("locations(id, name, slug)")
        .eq("organization_user_id", ou.id);
      locations = (data ?? []).map((r) => r.locations).filter(Boolean) as typeof locations;
    }
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? ou?.full_name ?? null,
    isSuperadmin,
    org: ou
      ? {
          id: ou.id,
          organization_id: ou.organization_id,
          role: ou.role as OrgRole,
          can_adjust_points: ou.can_adjust_points,
          full_name: ou.full_name,
        }
      : null,
    organizationName: (ou?.organizations as { display_name: string } | null)?.display_name ?? null,
    locations,
  };
}

export const useSession = () =>
  useQuery({ queryKey: sessionQueryKey, queryFn: fetchSessionInfo, staleTime: 30_000 });

const LOCATION_KEY = "puntia:active-location";
export const getActiveLocation = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(LOCATION_KEY);
export const setActiveLocation = (id: string) => window.localStorage.setItem(LOCATION_KEY, id);

const LOCATION_FILTER_KEY = "fideleo:selected-locations";
export const locationFilterEvent = "fideleo:location-filter-changed";

export const getSelectedLocationIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCATION_FILTER_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const setSelectedLocationIds = (ids: string[]) => {
  window.localStorage.setItem(LOCATION_FILTER_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(locationFilterEvent, { detail: ids }));
};
