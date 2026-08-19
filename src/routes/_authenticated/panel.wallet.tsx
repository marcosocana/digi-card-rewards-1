import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { data: session } = useSession();
  const orgId = session?.org?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ["wallet-passes", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_passes")
        .select("provider, status, is_sandbox, memberships!inner(organization_id)")
        .eq("memberships.organization_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const count = (fn: (p: { provider: string; status: string }) => boolean) =>
    (data ?? []).filter((p) => fn(p as { provider: string; status: string })).length;

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Estado de las tarjetas digitales. El proveedor está en modo simulación hasta cargar los certificados."
      />
      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Tarjetas totales" value={num(data?.length)} />
          <MetricCard label="Apple Wallet" value={num(count((p) => p.provider === "apple"))} />
          <MetricCard label="Google Wallet" value={num(count((p) => p.provider === "google"))} />
          <MetricCard
            label="Pendientes de actualizar"
            value={num(
              count((p) => p.status === "update_pending" || p.status === "pending_generation"),
            )}
          />
        </div>
      )}
      <div className="surface p-5">
        <h2 className="font-display text-lg font-semibold">Proveedor de emisión</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El sistema registra cada tarjeta y encola sus actualizaciones. Al conectar los
          certificados de Apple y las credenciales de Google, las tarjetas ya existentes se emitirán
          automáticamente sin perder el histórico.
        </p>
      </div>
    </>
  );
}
