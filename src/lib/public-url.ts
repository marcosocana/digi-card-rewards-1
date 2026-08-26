const publicOrigin = "https://fideleo.store";

export const getPublicAppOrigin = () => publicOrigin;

export const getCaptureUrl = (organizationSlug: string, locationSlug?: string) => {
  const path = locationSlug
    ? `/unirme/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(locationSlug)}`
    : `/unirme/${encodeURIComponent(organizationSlug)}`;
  return `${getPublicAppOrigin()}${path}`;
};
