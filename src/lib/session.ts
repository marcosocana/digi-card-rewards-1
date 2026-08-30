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

export interface SessionOrganization {
  id: string;
  name: string;
}

export type AdminScopeLevel = "global" | "organization" | "location";

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
  organizations: SessionOrganization[];
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
  let organizations: SessionOrganization[] = [];

  if (isSuperadmin) {
    const [organizationResult, locationResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, display_name")
        .is("archived_at", null)
        .order("display_name"),
      supabase
        .from("locations")
        .select("id, name, slug, organizations(id, display_name)")
        .eq("status", "active")
        .order("name"),
    ]);
    organizations = (organizationResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.display_name,
    }));
    locations = (locationResult.data ?? []).map((location) => ({
      id: location.id,
      name: location.name,
      slug: location.slug,
      organizationId: (location.organizations as { id: string } | null)?.id,
      organizationName: (location.organizations as { display_name: string } | null)?.display_name,
    }));
  } else if (ou) {
    organizations = organization
      ? [{ id: ou.organization_id, name: organization.display_name }]
      : [];
    if (ou.role === "admin") {
      const { data: assignments } = await supabase
        .from("user_location_assignments")
        .select("locations(id, name, slug)")
        .eq("organization_user_id", ou.id);
      const assignedLocations = (assignments ?? [])
        .map((row) => row.locations)
        .filter(Boolean) as SessionLocation[];
      const { data } = assignedLocations.length
        ? { data: assignedLocations }
        : await supabase
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
    organizations,
  };
}

export const useSession = () =>
  useQuery({ queryKey: sessionQueryKey, queryFn: fetchSessionInfo, staleTime: 30_000 });

const LOCATION_KEY = "puntia:active-location";
export const getActiveLocation = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(LOCATION_KEY);
export const setActiveLocation = (id: string) => window.localStorage.setItem(LOCATION_KEY, id);

const LOCATION_FILTER_KEY = "fideleo:selected-locations";
const ORGANIZATION_FILTER_KEY = "fideleo:selected-organization";
const SCOPE_LEVEL_KEY = "fideleo:selected-scope-level";
export const locationFilterEvent = "fideleo:location-filter-changed";
export const adminScopeEvent = "fideleo:admin-scope-changed";

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

export const getSelectedOrganizationId = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(ORGANIZATION_FILTER_KEY);

export const getSelectedScopeLevel = (): AdminScopeLevel => {
  if (typeof window === "undefined") return "global";
  const value = window.localStorage.getItem(SCOPE_LEVEL_KEY);
  return value === "organization" || value === "location" ? value : "global";
};

export const setSelectedAdminScope = (
  level: AdminScopeLevel,
  organizationId: string | null,
  locationIds: string[],
) => {
  window.localStorage.setItem(SCOPE_LEVEL_KEY, level);
  if (organizationId) window.localStorage.setItem(ORGANIZATION_FILTER_KEY, organizationId);
  else window.localStorage.removeItem(ORGANIZATION_FILTER_KEY);
  setSelectedLocationIds(locationIds);
  window.dispatchEvent(
    new CustomEvent(adminScopeEvent, { detail: { level, organizationId, locationIds } }),
  );
};

export function useAdminScope() {
  const { data: session } = useSession();
  const [selectedLocationIds, setLocationIds] = useState<string[]>([]);
  const [selectedOrganizationId, setOrganizationId] = useState<string | null>(null);
  const [scopeLevel, setScopeLevel] = useState<AdminScopeLevel>("global");

  useEffect(() => {
    setLocationIds(getSelectedLocationIds());
    setOrganizationId(getSelectedOrganizationId());
    setScopeLevel(getSelectedScopeLevel());
    const update = (event: Event) => {
      setLocationIds((event as CustomEvent<string[]>).detail);
    };
    window.addEventListener(locationFilterEvent, update);
    const updateScope = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          level: AdminScopeLevel;
          organizationId: string | null;
          locationIds: string[];
        }>
      ).detail;
      setScopeLevel(detail.level);
      setOrganizationId(detail.organizationId);
      setLocationIds(detail.locationIds);
    };
    window.addEventListener(adminScopeEvent, updateScope);
    return () => {
      window.removeEventListener(locationFilterEvent, update);
      window.removeEventListener(adminScopeEvent, updateScope);
    };
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
  const validSelectedOrganizationId = session?.organizations.some(
    (organization) => organization.id === selectedOrganizationId,
  )
    ? selectedOrganizationId
    : null;
  const scopedSuperadminOrg =
    validSelectedOrganizationId ?? (organizationIds.size === 1 ? [...organizationIds][0] : null);
  const organizationId = session?.isSuperadmin
    ? scopedSuperadminOrg
    : (session?.org?.organization_id ?? null);

  return {
    session,
    isSuperadmin: session?.isSuperadmin === true,
    isGlobal: session?.isSuperadmin === true && scopeLevel === "global",
    scopeLevel: session?.isSuperadmin ? scopeLevel : "organization",
    organizationId,
    selectedLocationIds: validLocationIds,
    canMutate: !session?.isSuperadmin || Boolean(organizationId),
  };
}
