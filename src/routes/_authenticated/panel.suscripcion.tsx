import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CreditCard, TrendingUp, XCircle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PlanUpgradeDialog } from "@/components/app/plan-upgrade-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { getHigherSubscriptionPlans, getSubscriptionPlan } from "@/lib/subscription-plans";
import { PageSkeleton } from "@/components/app/brand-loader";
import { useAdminScope } from "@/lib/session";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";

export const Route = createFileRoute("/_authenticated/panel/suscripcion")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { data: session } = useSession();
  const { organizationId: orgId, isGlobal } = useAdminScope();
  const { t } = useI18n();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription-detail", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("plan_code,subscription_status,subscription_current_period_end")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const currentPlanCode = subscription?.plan_code ?? session?.planCode;
  const plan = getSubscriptionPlan(currentPlanCode);
  const canUpgrade = getHigherSubscriptionPlans(currentPlanCode).length > 0;
  const cancellationWhatsappUrl = `https://wa.me/34695834018?text=${encodeURIComponent(
    `Hola, quiero cancelar mi plan ${plan?.name ?? ""} de Fideleo.`,
  )}`;

  const periodEnd = subscription?.subscription_current_period_end
    ? new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(
        new Date(subscription.subscription_current_period_end),
      )
    : null;

  if (isGlobal)
    return (
      <>
        <PageHeader
          title={t("Mi suscripción")}
          description={t("Consulta y gestiona el plan de cualquier empresa.")}
        />
        <AdminScopeNotice action="consultar y gestionar su suscripción" />
      </>
    );
  if (isLoading) return <PageSkeleton variant="detail" />;

  return (
    <>
      <PageHeader
        title={t("Mi suscripción")}
        description={t("Consulta tu plan, amplía sus límites o gestiona su cancelación.")}
      />

      <section className="surface overflow-hidden">
        <div className={`${plan?.color ?? "bg-muted"} p-6 sm:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-black/60">
                <CreditCard className="size-4" /> {t("Plan actual")}
              </div>
              <h2 className="mt-3 font-display text-4xl font-bold text-black">
                {plan?.name ?? t("Sin plan")}
              </h2>
              {plan ? (
                <p className="mt-2 text-xl font-semibold text-black">
                  {plan.price} <span className="text-sm font-normal text-black/55">/ mes</span>
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-black/10 px-3 py-1.5 text-xs font-semibold capitalize text-black">
              {subscription?.subscription_status ?? session?.subscriptionStatus ?? "—"}
            </span>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h3 className="font-semibold">{t("Incluido en tu plan")}</h3>
            {plan ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-emerald-600" /> {t(feature)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("No hay un plan activo asociado a esta cuenta.")}
              </p>
            )}
            {periodEnd ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {t("Próxima renovación: {date}", { date: periodEnd })}
              </p>
            ) : null}
          </div>

          <div className="flex min-w-56 flex-col gap-2">
            {canUpgrade ? (
              <Button onClick={() => setUpgradeOpen(true)}>
                <TrendingUp className="size-4" /> {t("Mejorar el plan")}
              </Button>
            ) : null}
            <Button asChild variant="outline" className="text-destructive hover:text-destructive">
              <a href={cancellationWhatsappUrl} target="_blank" rel="noopener noreferrer">
                <XCircle className="size-4" />
                {t("Cancelar plan")}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <PlanUpgradeDialog
        currentPlanCode={currentPlanCode}
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </>
  );
}
