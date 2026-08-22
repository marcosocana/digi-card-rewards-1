import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Gift,
  Menu,
  QrCode,
  ScanLine,
  Sparkles,
  Users,
  Store,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fideleo — Fidelización digital para negocios que quieren crecer" },
      {
        name: "description",
        content:
          "Crea un club de fidelización con Wallet, QR, recompensas, campañas y métricas. Sin app y preparado para uno o varios establecimientos.",
      },
      { property: "og:title", content: "Fideleo — Convierte cada visita en una relación" },
      {
        property: "og:description",
        content: "La plataforma de fidelización digital para captar, conocer y recuperar clientes.",
      },
    ],
  }),
  component: HomePage,
});

const howItWorks = [
  {
    number: "01",
    icon: QrCode,
    title: "El cliente conoce Fideleo",
    text: "El cliente llega a tu local y conoce Fideleo a través de carteles, soportes, la carta o por el camarero. Lo importante es que nos conozca.",
    color: "bg-[#dff7ff]",
  },
  {
    number: "02",
    icon: Users,
    title: "Se registra en un minuto",
    text: "Al escanear el QR accede a un espacio con el logo y los colores del local, donde completa un breve registro que tarda solo un minuto.",
    color: "bg-[#f3e9ff]",
  },
  {
    number: "03",
    icon: WalletCards,
    title: "Añade su tarjeta al móvil",
    text: "Puede añadir directamente la tarjeta de Fideleo a su móvil para tenerla siempre a mano y enseñarla cada vez que consuma.",
    color: "bg-[#fff0d8]",
  },
  {
    number: "04",
    icon: ScanLine,
    title: "El equipo suma los puntos",
    text: "El camarero escanea la tarjeta con nuestro sistema y contabiliza los puntos de forma rápida y segura.",
    color: "bg-[#e7f8ed]",
  },
  {
    number: "05",
    icon: Gift,
    title: "Los puntos se convierten en premios",
    text: "El cliente acumula puntos y puede convertirlos en productos gratis cuando alcance el volumen de puntos que tú decidas.",
    color: "bg-[#ffd9ee]",
  },
];

const plans = [
  {
    name: "Essential",
    price: "49 €",
    checkoutUrl: import.meta.env.VITE_STRIPE_ESSENTIAL_CHECKOUT_URL as string | undefined,
    color: "bg-[#dff7ff]",
    features: [
      "1 establecimiento",
      "Hasta 1.000 clientes",
      "Tarjeta digital y QR",
      "Panel de métricas",
    ],
  },
  {
    name: "Growth",
    price: "89 €",
    checkoutUrl: import.meta.env.VITE_STRIPE_GROWTH_CHECKOUT_URL as string | undefined,
    color: "bg-[#f8b9e7]",
    featured: true,
    features: [
      "Hasta 3 establecimientos",
      "Hasta 5.000 clientes",
      "Campañas y automatizaciones",
      "Soporte prioritario",
    ],
  },
  {
    name: "Scale",
    price: "A medida",
    checkoutUrl: import.meta.env.VITE_STRIPE_SCALE_CHECKOUT_URL as string | undefined,
    color: "bg-[#ffe65c]",
    features: [
      "Establecimientos ilimitados",
      "Clientes ilimitados",
      "Integraciones a medida",
      "Acompañamiento dedicado",
    ],
  },
];

function BrandMark({ onDark = false }: { onDark?: boolean }) {
  return (
    <img
      src="/logo.svg"
      alt="Fideleo"
      width={210}
      height={47}
      className={cn("h-8 w-auto", onDark && "invert")}
    />
  );
}

function HomePage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111111]">
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "border-b border-black/10 bg-white/85 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-[1440px] items-center justify-between px-5 transition-all duration-300 lg:px-10",
            scrolled ? "py-3" : "py-5",
          )}
        >
          <Link to="/" aria-label="Fideleo, inicio">
            <BrandMark />
          </Link>
          <nav
            className="hidden items-center gap-8 text-sm font-medium lg:flex"
            aria-label="Navegación principal"
          >
            <a href="#como-funciona" className="hover:opacity-55">
              Cómo funciona
            </a>
            <a href="#precios" className="hover:opacity-55">
              Precios
            </a>
            <a href="#negocios" className="hover:opacity-55">
              Para tu negocio
            </a>
            <a href="#preguntas" className="hover:opacity-55">
              Preguntas
            </a>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Button asChild variant="ghost">
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
            <Button asChild className="rounded-full bg-black px-6 text-white hover:bg-black/75">
              <Link to="/solicitar-demo">Solicitar demo</Link>
            </Button>
          </div>
          <Button
            className="sm:hidden"
            variant="ghost"
            size="icon"
            aria-label={mobileMenu ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu((current) => !current)}
          >
            <Menu />
          </Button>
        </div>
        {mobileMenu ? (
          <nav
            className="mx-4 rounded-2xl border border-black/10 bg-white p-3 shadow-xl sm:hidden"
            aria-label="Navegación móvil"
          >
            {[
              ["#como-funciona", "Cómo funciona"],
              ["#precios", "Precios"],
              ["#negocios", "Para tu negocio"],
              ["#preguntas", "Preguntas"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenu(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-black/5"
              >
                {label}
              </a>
            ))}
            <Button asChild className="mt-2 w-full rounded-xl bg-black text-white">
              <Link to="/solicitar-demo">Solicitar demo</Link>
            </Button>
          </nav>
        ) : null}
      </header>

      <section className="relative bg-[#f8b9e7] px-5 pb-16 pt-32 sm:pt-40 lg:px-10 lg:pb-24">
        <div className="pointer-events-none absolute -right-20 top-10 size-72 rounded-full bg-[#ffdf55] lg:size-96" />
        <div className="relative mx-auto max-w-[1440px]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr]">
            <div className="relative z-10 max-w-3xl">
              <h1 className="text-[clamp(3.4rem,7vw,7.5rem)] font-semibold leading-[.88] tracking-[-.07em]">
                Fideliza a tu cliente para que siempre vuelva
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed sm:text-xl">
                Capta clientes, premia su fidelidad y consigue que repitan gracias a la tarjeta
                digital que vive en su móvil.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-13 rounded-full bg-black px-7 text-white hover:bg-black/75"
                >
                  <a href="#como-funciona">
                    Ver cómo funciona <ArrowRight />
                  </a>
                </Button>
              </div>
            </div>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-white px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-sm text-sm font-semibold">
            Un sistema flexible para negocios que viven de sus clientes recurrentes.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-lg font-semibold text-black/40">
            <span>Cafeterías</span>
            <span>Restaurantes</span>
            <span>Retail</span>
            <span>Franquicias</span>
            <span>Servicios</span>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#c93c9f]">
              Del primer contacto a la recompensa
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Cómo funciona Fideleo
            </h2>
          </div>
          <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 lg:-mx-10 lg:px-10">
            {howItWorks.map((item) => (
              <article
                key={item.title}
                className={`${item.color} group flex min-h-[34rem] w-[85vw] max-w-[30rem] shrink-0 snap-center flex-col rounded-[2rem] p-7 sm:p-10`}
              >
                <div className="flex items-start justify-between">
                  <item.icon className="size-8" />
                  <span className="text-sm font-bold">{item.number} / 05</span>
                </div>
                <div
                  className="mt-8 flex-1 rounded-[1.5rem] border border-black/10 bg-white/35"
                  aria-label="Espacio reservado para imagen"
                />
                <h3 className="mt-8 max-w-lg text-3xl font-semibold leading-tight tracking-[-.04em]">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-xl leading-relaxed text-black/65">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="bg-[#111] px-5 py-24 text-white lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#f8b9e7]">Precios</p>
          <h2 className="mt-4 max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-6xl">
            Un plan para cada etapa de tu negocio.
          </h2>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  plan.color,
                  "flex min-h-[31rem] flex-col rounded-[2rem] p-7 text-black sm:p-9",
                  plan.featured && "ring-4 ring-white",
                )}
              >
                {plan.featured ? (
                  <span className="mb-5 w-fit rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                    Más elegido
                  </span>
                ) : null}
                <h3 className="text-3xl font-semibold">{plan.name}</h3>
                <p className="mt-5 text-5xl font-semibold tracking-[-.06em]">{plan.price}</p>
                <p className="mt-1 text-sm text-black/55">al mes · IVA no incluido</p>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check className="mt-0.5 size-5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-auto rounded-full bg-black text-white hover:bg-black/75"
                >
                  {plan.checkoutUrl ? (
                    <a href={plan.checkoutUrl}>Comprar</a>
                  ) : (
                    <Link to="/solicitar-demo" search={{ plan: plan.name }}>
                      Comprar
                    </Link>
                  )}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="negocios" className="bg-[#d9f4ff] px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em]">
                Control sin complejidad
              </p>
              <h2 className="mt-4 text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-6xl">
                Una visión clara de lo que hace volver a tus clientes.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/65">
                Consulta rendimiento por periodo y ubicación, identifica clientes recurrentes y mide
                el impacto real de recompensas y campañas.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  "Ventas y ticket medio",
                  "Altas y recurrencia",
                  "Wallet y recompensas",
                  "Rendimiento por local",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 font-medium">
                    <BadgeCheck className="size-5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <AnalyticsPreview />
          </div>
        </div>
      </section>

      <section className="px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[2rem] bg-[#f4efff] p-8">
              <Users className="size-8" />
              <p className="mt-14 text-6xl font-semibold tracking-[-.06em]">12.500+</p>
              <p className="mt-2 text-lg">clientes ya forman parte de clubes Fideleo</p>
            </div>
            <div className="rounded-[2rem] bg-[#ffe65c] p-8">
              <Store className="size-8" />
              <p className="mt-14 text-6xl font-semibold tracking-[-.06em]">48</p>
              <p className="mt-2 text-lg">locales fidelizan a sus clientes cada día</p>
            </div>
            <div className="rounded-[2rem] bg-[#ffd9ee] p-8">
              <Gift className="size-8" />
              <p className="mt-14 text-6xl font-semibold tracking-[-.06em]">31.800</p>
              <p className="mt-2 text-lg">premios y productos canjeados</p>
            </div>
          </div>
        </div>
      </section>

      <section id="preguntas" className="border-t border-black/10 px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#c93c9f]">
              Preguntas frecuentes
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
              Lo importante, claro desde el principio.
            </h2>
          </div>
          <div className="divide-y divide-black/15 border-y border-black/15">
            {[
              [
                "¿El cliente tiene que descargar una app?",
                "No. Puede usar su tarjeta web y, cuando estén configuradas las credenciales del negocio, añadirla a Apple Wallet o Google Wallet.",
              ],
              [
                "¿Sirve para varias ubicaciones?",
                "Sí. Fideleo está diseñado como SaaS multiempresa y multiubicación, con permisos y métricas separadas por local.",
              ],
              [
                "¿Qué mecánicas puedo utilizar?",
                "Acumulación por gasto, puntos, sellos, cashback, membresías, cupones y tarjetas regalo.",
              ],
              [
                "¿Mi equipo puede usarlo desde la barra?",
                "Sí. El escáner está optimizado para móvil y tablet, e incluye búsqueda alternativa por nombre, email, teléfono o número de socio.",
              ],
            ].map(([question, answer]) => (
              <details key={question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-semibold">
                  {question}
                  <span className="text-2xl font-normal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pt-4 leading-relaxed text-black/60">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="px-5 pb-5 lg:px-10 lg:pb-10">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[2.5rem] bg-[#f8b9e7] px-6 py-16 text-center sm:px-10 lg:py-24">
          <CircleDollarSign className="mx-auto size-10" />
          <h2 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl">
            Empieza a convertir clientes ocasionales en habituales.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-black/65">
            Explora el backoffice con las cuentas demo o entra en la experiencia pública de Café
            Norte.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-13 rounded-full bg-black px-8 text-white hover:bg-black/75"
            >
              <Link to="/auth">
                Probar el backoffice <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full border-black bg-transparent px-8"
            >
              <Link to="/club/$businessSlug" params={{ businessSlug: "cafe-norte" }}>
                Ver club de ejemplo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-[#111] px-5 py-12 text-white lg:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <BrandMark onDark />

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
              La plataforma para captar, conocer y fidelizar clientes desde una tarjeta digital.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Producto</p>
            <ul className="mt-4 space-y-2 text-sm text-white/55">
              <li>
                <a href="#como-funciona">Cómo funciona</a>
              </li>
              <li>
                <a href="#precios">Precios</a>
              </li>
              <li>
                <Link to="/auth">Acceso</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Experiencia</p>
            <ul className="mt-4 space-y-2 text-sm text-white/55">
              <li>
                <Link to="/club/$businessSlug" params={{ businessSlug: "cafe-norte" }}>
                  Club de ejemplo
                </Link>
              </li>
              <li>
                <Link to="/auth">Cuentas demo</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-4 space-y-2 text-sm text-white/55">
              <li>
                <Link to="/legal/$document" params={{ document: "terminos" }}>
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link to="/legal/$document" params={{ document: "privacidad" }}>
                  Privacidad
                </Link>
              </li>
              <li>
                <Link to="/legal/$document" params={{ document: "aviso-legal" }}>
                  Aviso legal
                </Link>
              </li>
              <li>
                <Link to="/legal/$document" params={{ document: "cookies" }}>
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-[1440px] flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Fideleo</span>
          <span>Fidelización digital, sin fricción.</span>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-2xl lg:translate-x-10">
      <div className="rounded-[2rem] border-[8px] border-black bg-[#f7f7fb] p-3 shadow-[0_30px_80px_rgba(0,0,0,.2)] sm:p-5">
        <div className="flex items-center gap-3 border-b border-black/10 pb-4">
          <span className="grid size-9 place-items-center rounded-lg bg-black text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-bold">FIDELEO</span>
          <div className="ml-auto hidden h-9 w-1/2 items-center rounded-lg border bg-white px-3 text-xs text-black/40 sm:flex">
            Buscar cliente...
          </div>
        </div>
        <div className="grid gap-3 pt-4 sm:grid-cols-[8rem_1fr]">
          <aside className="hidden space-y-2 text-xs sm:block">
            {["Resumen", "Escáner", "Clientes", "Campañas", "Estadísticas"].map((item, index) => (
              <div
                key={item}
                className={`rounded-lg px-3 py-2.5 ${index === 0 ? "bg-[#f8d9ef] font-semibold" : "text-black/45"}`}
              >
                {item}
              </div>
            ))}
          </aside>
          <div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-black/40">Café Norte · Últimos 30 días</p>
                <p className="text-xl font-bold tracking-tight">Buenos días, Lucía</p>
              </div>
              <span className="rounded-full bg-[#ddf8ec] px-2 py-1 text-[9px] font-semibold text-[#167a52]">
                ● En directo
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniMetric label="Clientes activos" value="842" trend="+12%" />
              <MiniMetric label="Ventas asociadas" value="31.480 €" trend="+8,4%" />
            </div>
            <div className="mt-2 rounded-xl border bg-white p-4">
              <div className="flex justify-between text-[10px]">
                <span className="font-semibold">Evolución de visitas</span>
                <span className="text-black/35">30 días</span>
              </div>
              <div className="mt-5 flex h-24 items-end gap-1.5">
                {[36, 52, 44, 68, 61, 75, 58, 84, 73, 91, 82, 100].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t bg-[#df5ab6]"
                    style={{ height: `${height}%`, opacity: 0.5 + index / 24 }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-[#d9f4ff] p-3">
              <span className="grid size-8 place-items-center rounded-full bg-white">
                <Gift className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold">Oportunidad de fidelización</p>
                <p className="text-[9px] text-black/50">
                  46 clientes están a una visita de su recompensa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-8 -left-5 hidden w-52 rounded-2xl border bg-white p-4 shadow-xl sm:block">
        <p className="text-[10px] font-semibold">Tarjeta actualizada</p>
        <div className="mt-3 rounded-xl bg-black p-3 text-white">
          <p className="text-[8px] text-white/55">CAFÉ NORTE CLUB</p>
          <p className="mt-6 text-sm font-semibold">75 / 100 puntos</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/20">
            <div className="h-full w-3/4 rounded-full bg-[#f8b9e7]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-[9px] text-black/40">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-lg font-bold tracking-tight">{value}</p>
        <span className="text-[9px] font-semibold text-[#149467]">↑ {trend}</span>
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const locations = [
    ["Malasaña", 82],
    ["Chamberí", 68],
    ["Retiro", 61],
    ["Salamanca", 54],
    ["Chueca", 47],
  ] as const;
  return (
    <div className="rounded-[2rem] bg-[#9c98aa] p-4 sm:p-7">
      <div className="rounded-2xl bg-[#fafafd] p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-black/40">
              Estadísticas / <strong className="text-black">Resumen</strong>
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">Rendimiento del club</h3>
          </div>
          <span className="rounded-lg border bg-white px-3 py-2 text-xs">
            Todas las ubicaciones
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniMetric label="Retención" value="64%" trend="5,2%" />
          <MiniMetric label="Ticket medio" value="12,80 €" trend="3,8%" />
          <MiniMetric label="Canjes" value="184" trend="11%" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold">Ingresos registrados</p>
            <div className="mt-5 space-y-3">
              {locations.map(([name, width]) => (
                <div key={name}>
                  <div className="flex justify-between text-[10px]">
                    <span>{name}</span>
                    <span>{width}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[#df5ab6]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold">Clientes</p>
            <div
              className="mx-auto mt-5 grid size-28 place-items-center rounded-full"
              style={{ background: "conic-gradient(#df5ab6 0 64%, #d9dbea 64% 100%)" }}
            >
              <div className="grid size-20 place-items-center rounded-full bg-white text-xl font-bold">
                64%
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-black/45">Clientes recurrentes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
