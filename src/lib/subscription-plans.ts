export const subscriptionPlans = [
  {
    code: "basic",
    name: "Básico",
    price: "24,95 €",
    maxLocations: 1,
    color: "bg-[#dff7ff]",
    featured: false,
    features: [
      "1 establecimiento",
      "Hasta 1.000 clientes",
      "Tarjeta digital y QR",
      "Panel de métricas",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: "44,95 €",
    maxLocations: 3,
    color: "bg-[#f8b9e7]",
    featured: false,
    features: [
      "Hasta 3 establecimientos",
      "Hasta 5.000 clientes",
      "Notificaciones y automatizaciones",
      "Soporte prioritario",
    ],
  },
  {
    code: "ultra",
    name: "Ultra",
    price: "99,95 €",
    maxLocations: 15,
    color: "bg-[#ffe65c]",
    featured: false,
    features: [
      "Hasta 15 establecimientos",
      "Clientes ilimitados",
      "Integraciones a medida",
      "Acompañamiento dedicado",
    ],
  },
] as const;

export type SubscriptionPlanCode = (typeof subscriptionPlans)[number]["code"];

export const getSubscriptionPlan = (code: string | null | undefined) =>
  subscriptionPlans.find((plan) => plan.code === code) ?? null;

export const getHigherSubscriptionPlans = (code: string | null | undefined) => {
  const currentIndex = subscriptionPlans.findIndex((plan) => plan.code === code);
  return currentIndex < 0 ? subscriptionPlans : subscriptionPlans.slice(currentIndex + 1);
};
