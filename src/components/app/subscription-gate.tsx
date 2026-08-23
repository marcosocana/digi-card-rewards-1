import { useEffect, useState } from "react";
import { Check, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    code: "essential",
    name: "Essential",
    price: "49 €",
    color: "bg-[#dff7ff]",
    features: [
      "1 establecimiento",
      "Hasta 1.000 clientes",
      "Tarjeta digital y QR",
      "Panel de métricas",
    ],
  },
  {
    code: "growth",
    name: "Growth",
    price: "89 €",
    color: "bg-[#f8b9e7]",
    featured: true,
    features: [
      "Hasta 3 establecimientos",
      "Hasta 5.000 clientes",
      "Notificaciones y automatizaciones",
      "Soporte prioritario",
    ],
  },
  {
    code: "scale",
    name: "Scale",
    price: "A medida",
    color: "bg-[#ffe65c]",
    features: [
      "Establecimientos ilimitados",
      "Clientes ilimitados",
      "Integraciones a medida",
      "Acompañamiento dedicado",
    ],
  },
] as const;

export function SubscriptionGate() {
  const { data: session, refetch } = useSession();
  const { t } = useI18n();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const checkoutResult =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("checkout");
  const blocked = Boolean(session?.org) && !session?.hasActivePlan;
  const canPurchase = session?.org?.role === "admin";

  useEffect(() => {
    if (!blocked || checkoutResult !== "success") return;
    setCheckingPayment(true);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void refetch().then(({ data }) => {
        if (data?.hasActivePlan) {
          window.clearInterval(timer);
          setCheckingPayment(false);
          window.history.replaceState({}, "", "/panel");
          toast.success(t("Plan activado"));
        } else if (attempts >= 12) {
          window.clearInterval(timer);
          setCheckingPayment(false);
        }
      });
    }, 2_500);
    return () => window.clearInterval(timer);
  }, [blocked, checkoutResult, refetch, t]);

  if (!blocked) return null;

  const choosePlan = async (planCode: string) => {
    if (!canPurchase) {
      toast.error(t("Solo un administrador puede contratar el plan"));
      return;
    }
    setLoadingPlan(planCode);
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { planCode },
    });
    setLoadingPlan(null);
    if (error || !data?.url) {
      toast.error(t("No se pudo iniciar el pago"), {
        description: data?.error || error?.message,
      });
      return;
    }
    window.location.assign(data.url);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/auth");
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/35 p-3 backdrop-blur-md sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-title"
        className="my-auto w-full max-w-6xl rounded-[2rem] border border-black bg-white p-5 text-black shadow-2xl sm:p-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-black text-white">
            <ShieldCheck className="size-5" />
          </span>
          <h1
            id="subscription-title"
            className="mt-4 text-3xl font-bold tracking-[-.04em] sm:text-4xl"
          >
            {t("Elige un plan para acceder a Fideleo")}
          </h1>
          <p className="mt-3 text-sm text-black/60 sm:text-base">
            {t(
              "Tu cuenta ya está creada. Activa uno de los planes para desbloquear el panel de gestión.",
            )}
          </p>
          {checkoutResult === "success" ? (
            <p className="mt-4 rounded-xl bg-[#e7f8ed] px-4 py-3 text-sm font-medium">
              {checkingPayment
                ? t("Estamos confirmando el pago con Stripe…")
                : t("El pago todavía se está validando. Puedes volver a comprobarlo.")}
            </p>
          ) : null}
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.code}
              className={cn(
                "flex min-h-[22rem] flex-col rounded-[1.5rem] border border-black/20 p-6",
                plan.color,
                plan.featured && "ring-2 ring-black",
              )}
            >
              {plan.featured ? (
                <span className="mb-3 w-fit rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                  {t("Más elegido")}
                </span>
              ) : null}
              <h2 className="text-2xl font-bold">{plan.name}</h2>
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
                disabled={!canPurchase || loadingPlan !== null || checkingPayment}
                onClick={() => void choosePlan(plan.code)}
              >
                {loadingPlan === plan.code ? <Loader2 className="size-4 animate-spin" /> : null}
                {t(plan.code === "scale" ? "Solicitar plan" : "Elegir plan")}
              </Button>
            </article>
          ))}
        </div>

        {!canPurchase ? (
          <p className="mt-5 text-center text-sm text-black/60">
            {t("Pide a un administrador de la cuenta que seleccione el plan.")}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {checkoutResult === "success" ? (
            <Button variant="outline" onClick={() => void refetch()} disabled={checkingPayment}>
              {checkingPayment ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("Comprobar acceso")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="text-black/55 hover:text-black"
            onClick={() => void signOut()}
          >
            <LogOut className="size-4" />
            {t("Cerrar sesión")}
          </Button>
        </div>
      </section>
    </div>
  );
}
