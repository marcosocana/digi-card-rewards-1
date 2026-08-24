import { useState } from "react";
import { Check, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  getHigherSubscriptionPlans,
  getSubscriptionPlan,
  type SubscriptionPlanCode,
} from "@/lib/subscription-plans";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PlanUpgradeDialogProps {
  currentPlanCode: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanUpgradeDialog({ currentPlanCode, open, onOpenChange }: PlanUpgradeDialogProps) {
  const { t } = useI18n();
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanCode | null>(null);
  const currentPlan = getSubscriptionPlan(currentPlanCode);
  const higherPlans = getHigherSubscriptionPlans(currentPlanCode);

  const choosePlan = async (planCode: SubscriptionPlanCode) => {
    setLoadingPlan(planCode);
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { planCode },
    });
    setLoadingPlan(null);

    if (error || !data?.url) {
      toast.error(t("No se pudo iniciar el cambio de plan"), {
        description: data?.error || error?.message,
      });
      return;
    }
    window.location.assign(data.url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <span className="mb-2 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <TrendingUp className="size-5" />
          </span>
          <DialogTitle className="text-2xl">{t("Necesitas un plan superior")}</DialogTitle>
          <DialogDescription>
            {currentPlan
              ? t("Has alcanzado el máximo de establecimientos de tu plan {plan}.", {
                  plan: currentPlan.name,
                })
              : t("Elige un plan para añadir más establecimientos.")}
          </DialogDescription>
        </DialogHeader>

        {higherPlans.length ? (
          <div className={cn("grid gap-4", higherPlans.length > 1 && "md:grid-cols-2")}>
            {higherPlans.map((plan) => (
              <article
                key={plan.code}
                className={cn(
                  "flex min-h-80 flex-col rounded-3xl border border-black/15 p-6 text-black",
                  plan.color,
                )}
              >
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-3 text-4xl font-bold tracking-[-.05em]">{plan.price}</p>
                <p className="mt-1 text-xs text-black/55">{t("al mes · IVA no incluido")}</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0" />
                      {t(feature)}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-auto rounded-full bg-black text-white hover:bg-black/75"
                  disabled={loadingPlan !== null}
                  onClick={() => void choosePlan(plan.code)}
                >
                  {loadingPlan === plan.code ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("Mejorar a {plan}", { plan: plan.name })}
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
            {t(
              "Ya tienes el plan con mayor capacidad. Contacta con Fideleo si necesitas más establecimientos.",
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
