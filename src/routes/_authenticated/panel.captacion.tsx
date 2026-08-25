import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminScope } from "@/lib/session";
import { downloadDataUrl, qrPngDataUrl } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/panel/captacion")({
  component: CaptacionPage,
});

function CaptacionPage() {
  const { session, organizationId: orgId, isSuperadmin, selectedLocationIds } = useAdminScope();
  const [origin, setOrigin] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => setOrigin(window.location.origin), []);

  const { data, isLoading } = useQuery({
    queryKey: ["capture-locations", orgId, isSuperadmin, [...selectedLocationIds].sort().join(",")],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let query = supabase
        .from("locations")
        .select("id, name, slug, organizations(slug,display_name)")
        .eq("status", "active")
        .order("name");
      if (orgId) query = query.eq("organization_id", orgId);
      if (selectedLocationIds.length) query = query.in("id", selectedLocationIds);
      const { data, error } = await query;
      if (error) throw error;
      return { locations: data ?? [] };
    },
  });

  useEffect(() => {
    if (!data || !origin) return;
    void (async () => {
      const entries = await Promise.all(
        data.locations.map(
          async (l) =>
            [
              l.id,
              await qrPngDataUrl(
                `${origin}/unirme/${(l.organizations as { slug: string } | null)?.slug ?? ""}/${l.slug}`,
              ),
            ] as const,
        ),
      );
      setCodes(Object.fromEntries(entries));
    })();
  }, [data, origin]);

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
            const url = `${origin}/unirme/${organization?.slug ?? ""}/${l.slug}`;
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
                <p className="break-all text-xs text-muted-foreground">{url}</p>
                <div className="flex gap-2">
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
