const defaultPublicOrigin = "https://fideleovdos.vercel.app";

export const getPublicAppOrigin = () =>
  (import.meta.env.VITE_PUBLIC_APP_URL?.trim() || defaultPublicOrigin).replace(/\/$/, "");

export const getCaptureUrl = (organizationSlug: string, locationSlug?: string) => {
  const path = locationSlug
    ? `/unirme/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(locationSlug)}`
    : `/unirme/${encodeURIComponent(organizationSlug)}`;
  return `${getPublicAppOrigin()}${path}`;
};
