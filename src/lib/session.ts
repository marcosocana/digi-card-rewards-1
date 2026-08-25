import { useEffect, useState } from "react";
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

export interface SessionLocation {
  id: string;
  name: string;
  slug: string;
  organizationId?: string;
  organizationName?: string;
}

export interface SessionInfo {
  userId: string;
  email: string | null;
  fullName: string | null;
  isSuperadmin: boolean;
  org: Membership | null;
  organizationName: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  hasActivePlan: boolean;
  locations: SessionLocation[];
}

export const sessionQueryKey = ["session-info"];

export async function fetchSessionInfo(): Promise<SessionInfo | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  // Repairs legacy accounts and OAuth users that were created before the
  // business provisioning trigger existed. The RPC is idempotent.
  await supabase.rpc("ensure_current_business_account", {});

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, platform_role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: ou } = await supabase
    .from("organization_users")
    .select(
      "id, organization_id, role, can_adjust_points, full_name, organizations(display_name, plan_code, subscription_status)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const isSuperadmin = profile?.platform_role === "superadmin";
  const organization = ou?.organizations as {
    display_name: string;
    plan_code: string | null;
    subscription_status: string;
  } | null;
  let locations: SessionLocation[] = [];

  if (isSuperadmin) {
    const { data } = await supabase
      .from("locations")
      .select("id, name, slug, organizations(id, display_name)")
      .eq("status", "active")
      .order("name");
    locations = (data ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      slug: location.slug,
      organizationId: (location.organizations as { id: string } | null)?.id,
      organizationName: (location.organizations as { display_name: string } | null)?.display_name,
    }));
  } else if (ou) {
    if (ou.role === "admin") {
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
    organizationName: organization?.display_name ?? null,
    planCode: organization?.plan_code ?? null,
    subscriptionStatus: organization?.subscription_status ?? null,
    hasActivePlan:
      isSuperadmin || ["active", "trialing"].includes(organization?.subscription_status ?? ""),
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

export function useAdminScope() {
  const { data: session } = useSession();
  const [selectedLocationIds, setLocationIds] = useState<string[]>([]);

  useEffect(() => {
    setLocationIds(getSelectedLocationIds());
    const update = (event: Event) => {
      setLocationIds((event as CustomEvent<string[]>).detail);
    };
    window.addEventListener(locationFilterEvent, update);
    return () => window.removeEventListener(locationFilterEvent, update);
  }, []);

  const validLocationIds = selectedLocationIds.filter((id) =>
    session?.locations.some((location) => location.id === id),
  );
  const organizationIds = new Set(
    session?.locations
      .filter((location) => validLocationIds.includes(location.id))
      .map((location) => location.organizationId)
      .filter((id): id is string => Boolean(id)) ?? [],
  );
  const scopedSuperadminOrg = organizationIds.size === 1 ? [...organizationIds][0] : null;
  const organizationId = session?.isSuperadmin
    ? scopedSuperadminOrg
    : (session?.org?.organization_id ?? null);

  return {
    session,
    isSuperadmin: session?.isSuperadmin === true,
    isGlobal: session?.isSuperadmin === true && !organizationId,
    organizationId,
    selectedLocationIds: validLocationIds,
    canMutate: !session?.isSuperadmin || Boolean(organizationId),
  };
}
