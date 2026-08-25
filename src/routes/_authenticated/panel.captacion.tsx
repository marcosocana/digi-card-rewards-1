import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScope } from "@/lib/session";
import { downloadDataUrl, qrPngDataUrl } from "@/lib/qr";
import { getCaptureUrl } from "@/lib/public-url";

export const Route = createFileRoute("/_authenticated/panel/captacion")({
  component: CaptacionPage,
});

function CaptacionPage() {
  const { session, organizationId: orgId, isSuperadmin, selectedLocationIds } = useAdminScope();
  const [codes, setCodes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["capture-locations", orgId, isSuperadmin, [...selectedLocationIds].sort().join(",")],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let query = supabase
        .from("locations")
        .select(
          "id, name, slug, organizations!inner(slug,display_name,status), program_locations!inner(loyalty_programs!inner(id,status))",
        )
        .eq("status", "active")
        .eq("organizations.status", "active")
        .eq("program_locations.loyalty_programs.status", "active")
        .order("name");
      if (orgId) query = query.eq("organization_id", orgId);
      if (selectedLocationIds.length) query = query.in("id", selectedLocationIds);
      const { data, error } = await query;
      if (error) throw error;
      return { locations: data ?? [] };
    },
  });

  useEffect(() => {
    if (!data) return;
    void (async () => {
      const entries = await Promise.all(
        data.locations.map(
          async (l) =>
            [
              l.id,
              await qrPngDataUrl(
                getCaptureUrl((l.organizations as { slug: string } | null)?.slug ?? "", l.slug),
              ),
            ] as const,
        ),
      );
      setCodes(Object.fromEntries(entries));
    })();
  }, [data]);

  return (
    <>
      <PageHeader
        title="Captación"
        description="QR y enlaces públicos de alta por establecimiento."
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(data?.locations ?? []).map((l) => {
            const organization = l.organizations as {
              slug: string;
              display_name: string;
            } | null;
            const url = getCaptureUrl(organization?.slug ?? "", l.slug);
            return (
              <div key={l.id} className="surface flex flex-col items-center gap-3 p-5 text-center">
                <h2 className="font-display text-lg font-semibold">
                  {isSuperadmin ? `${organization?.display_name ?? "Sin empresa"} · ` : ""}
                  {l.name}
                </h2>
                {codes[l.id] ? (
                  <img
                    src={codes[l.id]}
                    alt={`QR de alta para ${l.name}`}
                    className="size-44 rounded-lg border"
                  />
                ) : (
                  <Skeleton className="size-44 rounded-lg" />
                )}
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-xs text-muted-foreground underline underline-offset-2"
                >
                  {url}
                </a>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={url} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden className="size-4" /> Abrir
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(url);
                      toast.success("Enlace copiado");
                    }}
                  >
                    <Copy aria-hidden className="size-4" /> Copiar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!codes[l.id]}
                    onClick={() => downloadDataUrl(codes[l.id]!, `qr-${l.slug}.png`)}
                  >
                    <Download aria-hidden className="size-4" /> Descargar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
