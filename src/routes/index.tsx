import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Gift,
  QrCode,
  ScanLine,
  Star,
  Users,
  Store,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subscriptionPlans } from "@/lib/subscription-plans";
import { CookieConsent, openCookieSettingsEvent } from "@/components/app/cookie-consent";
import { WhatsAppFloating } from "@/components/app/whatsapp-floating";
import { qrPngDataUrl } from "@/lib/qr";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fideleo — Fidelización digital para negocios que quieren crecer" },
      {
        name: "description",
        content:
          "Crea un club de fidelización con Wallet, QR, recompensas y métricas. Sin app y preparado para uno o varios establecimientos.",
      },
      { property: "og:title", content: "Fideleo — Convierte cada visita en una relación" },
      {
        property: "og:description",
        content: "La plataforma de fidelización digital para captar, conocer y recuperar clientes.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.fideleo.store/" }],
  }),
  component: HomePage,
});

const howItWorks = [
  {
    number: "01",
    icon: QrCode,
    title: "El cliente conoce tu programa de fidelización",
    text: "El cliente conoce el programa de fidelización de tu negocio a través de carteles, soportes, la carta o por el camarero o dependiente.",
    color: "bg-[#dff7ff]",
    image: "/how-it-works/01-descubre-handdrawn-v2.jpg",
    imageAlt: "Una clienta descubre el programa de fidelización al entrar en una cafetería",
  },
  {
    number: "02",
    icon: Users,
    title: "Se registra en un minuto",
    text: "Al escanear el QR accede a un espacio con el logo y los colores del local, donde completa un breve registro que tarda solo un minuto.",
    color: "bg-[#f3e9ff]",
    image: "/how-it-works/02-registro-handdrawn-v2.jpg",
    imageAlt: "Una persona escanea un código QR y completa un registro sencillo desde el móvil",
  },
  {
    number: "03",
    icon: WalletCards,
    title: "Añade su tarjeta al móvil",
    text: "Puede añadir directamente la tarjeta de fidelización de tu negocio a su móvil para tenerla siempre a mano y enseñarla cada vez que consuma.",
    color: "bg-[#fff0d8]",
    image: "/how-it-works/03-wallet-handdrawn-v2.jpg",
    imageAlt: "Una tarjeta de fidelización digital se añade a la cartera del móvil",
  },
  {
    number: "04",
    icon: ScanLine,
    title: "El equipo suma los puntos",
    text: "El camarero o dependiente de tu negocio escanea la tarjeta y suma los puntos de forma rápida y segura.",
    color: "bg-[#e7f8ed]",
    image: "/how-it-works/04-puntos-handdrawn-v2.jpg",
    imageAlt: "Un empleado escanea la tarjeta digital de una clienta para añadir sus puntos",
  },
  {
    number: "05",
    icon: Gift,
    title: "Los puntos se convierten en premios",
    text: "El cliente acumula puntos y puede convertirlos en productos gratis cuando alcance el volumen de puntos que tú decidas.",
    color: "bg-[#ffd9ee]",
    image: "/how-it-works/05-premios-handdrawn-v2.jpg",
    imageAlt: "Una clienta canjea sus puntos por un café y un producto gratis",
  },
];

const testimonials = [
  {
    name: "Sofía",
    business: "Bar Casa Andrea",
    image: "/testimonials/bar-casa-andrea-optimized-v2.png",
    avatar: "CA",
    avatarClassName: "bg-[#ffe65c] text-black",
    quote:
      "Me gusta tener los puntos de Casa Andrea siempre en el móvil. Así sé cuánto me falta para mi próxima recompensa cada vez que vuelvo.",
  },
  {
    name: "María",
    business: "Latteo Coffee",
    image: "/testimonials/latteo-coffee-optimized-v2.png",
    avatar: "L",
    avatarClassName: "bg-[#2388f4] text-white",
    quote:
      "La tarjeta de Latteo Coffee es muy cómoda: pido mi café, enseño el móvil y los puntos se actualizan al momento.",
  },
  {
    name: "Marcos",
    business: "Peluquería Álex",
    image: "/testimonials/peluqueria-alex-optimized-v2.png",
    avatar: "Á",
    avatarClassName: "bg-[#111111] text-white",
    quote:
      "En Peluquería Álex cada visita cuenta. Llevar la tarjeta digital conmigo hace que acumular puntos sea sencillo y no tenga que guardar nada más.",
  },
  {
    name: "Rocío",
    business: "Get Smashed Burger",
    image: "/testimonials/get-smashed-burger-optimized-v2.png",
    avatar: "GS",
    avatarClassName: "bg-[#7de8c1] text-black",
    quote:
      "Con la tarjeta de Get Smashed Burger veo mis puntos de un vistazo y siempre tengo un motivo más para volver por mi burger favorita.",
  },
];

const kpis = [
  {
    icon: Users,
    value: "12.500+",
    label: "clientes en clubes Fideleo",
    color: "bg-[#f4efff]",
  },
  {
    icon: Store,
    value: "48",
    label: "locales fidelizan cada día",
    color: "bg-[#ffe65c]",
  },
  {
    icon: Gift,
    value: "31.800",
    label: "premios y productos canjeados",
    color: "bg-[#ffd9ee]",
  },
  {
    icon: ScanLine,
    value: "2,4×",
    label: "visitas por cliente recurrente",
    color: "bg-[#dff7ff]",
  },
  {
    icon: BadgeCheck,
    value: "64%",
    label: "tasa de clientes recurrentes",
    color: "bg-[#e7f8ed]",
  },
] as const;

const clubExamplePath = "/club/cafe-norte";
const backofficeExamplePath = "/auth?email=admin.pro%40demo.fideleo.app";

function BrandMark({
  onDark = false,
  compactOnMobile = false,
}: {
  onDark?: boolean;
  compactOnMobile?: boolean;
}) {
  return (
    <>
      {compactOnMobile ? (
        <img
          src="/isotipo.svg"
          alt=""
          width={121}
          height={121}
          className="size-10"
          aria-hidden="true"
        />
      ) : null}
      <img
        src="/logo.svg"
        alt="Fideleo"
        width={210}
        height={47}
        className={cn("h-8 w-auto", compactOnMobile && "hidden lg:block", onDark && "invert")}
      />
    </>
  );
}

function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [clubQr, setClubQr] = useState("");
  const [currentHowStep, setCurrentHowStep] = useState(0);
  const howSectionRef = useRef<HTMLElement>(null);
  const howTrackRef = useRef<HTMLDivElement>(null);
  const howProgrammaticRef = useRef(false);
  const howScrollTimerRef = useRef<number | null>(null);
  const kpiTrackRef = useRef<HTMLDivElement>(null);
  const testimonialsTrackRef = useRef<HTMLDivElement>(null);

  const scrollHowTo = useCallback((index: number) => {
    const track = howTrackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (!track || !card) return;
    howProgrammaticRef.current = true;
    if (howScrollTimerRef.current) window.clearTimeout(howScrollTimerRef.current);
    const left = card.offsetLeft - track.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left, behavior: "smooth" });
    howScrollTimerRef.current = window.setTimeout(() => {
      howProgrammaticRef.current = false;
    }, 700);
  }, []);

  const selectHowStep = (index: number) => {
    const next = (index + howItWorks.length) % howItWorks.length;
    setCurrentHowStep(next);
    scrollHowTo(next);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void qrPngDataUrl(`${window.location.origin}${clubExamplePath}`, "#111111").then(setClubQr);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = howSectionRef.current;
    if (!section) return;

    let timer: number | null = null;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      timer = window.setInterval(() => {
        setCurrentHowStep((current) => {
          if (current >= howItWorks.length - 1) {
            if (timer) window.clearInterval(timer);
            timer = null;
            return current;
          }
          const next = current + 1;
          scrollHowTo(next);
          return next;
        });
      }, 20_000);
    };

    if (!("IntersectionObserver" in window)) {
      start();
      return () => {
        if (timer) window.clearInterval(timer);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        start();
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      if (timer) window.clearInterval(timer);
    };
  }, [scrollHowTo]);

  useEffect(() => {
    const track = howTrackRef.current;
    if (!track) return;

    track.scrollLeft = 0;
    setCurrentHowStep(0);
  }, []);

  useEffect(
    () => () => {
      if (howScrollTimerRef.current) window.clearTimeout(howScrollTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let previousTime = 0;
    let position = kpiTrackRef.current?.scrollLeft ?? 0;
    const move = (time: number) => {
      const track = kpiTrackRef.current;
      if (track) {
        const elapsed = previousTime ? Math.min(time - previousTime, 40) : 0;
        position += elapsed * 0.024;
        const firstCard = track.children[0] as HTMLElement | undefined;
        const firstDuplicate = track.children[kpis.length] as HTMLElement | undefined;
        const cycleWidth =
          firstCard && firstDuplicate ? firstDuplicate.offsetLeft - firstCard.offsetLeft : 0;
        if (cycleWidth && position >= cycleWidth) position -= cycleWidth;
        track.scrollLeft = position;
      }
      previousTime = time;
      frame = window.requestAnimationFrame(move);
    };

    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let previousTime = 0;
    let position = testimonialsTrackRef.current?.scrollLeft ?? 0;
    const move = (time: number) => {
      const track = testimonialsTrackRef.current;
      if (track) {
        const elapsed = previousTime ? Math.min(time - previousTime, 40) : 0;
        position += elapsed * 0.017;
        const firstCard = track.children[0] as HTMLElement | undefined;
        const firstDuplicate = track.children[testimonials.length] as HTMLElement | undefined;
        const cycleWidth =
          firstCard && firstDuplicate ? firstDuplicate.offsetLeft - firstCard.offsetLeft : 0;
        if (cycleWidth && position >= cycleWidth) position -= cycleWidth;
        track.scrollLeft = position;
      }
      previousTime = time;
      frame = window.requestAnimationFrame(move);
    };

    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#111111]">
      <WhatsAppFloating message="Hola, quiero saber cómo puede ayudar Fideleo a fidelizar los clientes de mi negocio." />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "border-b border-black/10 bg-white/85 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-[1440px] items-center justify-between px-3 transition-all duration-300 sm:px-5 lg:px-10",
            scrolled ? "py-3" : "py-5",
          )}
        >
          <Link to="/" aria-label="Fideleo, inicio" className="flex items-center gap-2.5">
            <BrandMark compactOnMobile />
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
          <div className="flex items-center gap-1 sm:gap-3">
            <Button
              asChild
              variant="ghost"
              className="h-10 whitespace-nowrap px-3 text-xs sm:h-11 sm:px-5 sm:text-[15px]"
            >
              <Link to="/auth">Acceder</Link>
            </Button>
            <Button
              asChild
              className="h-10 whitespace-nowrap rounded-full bg-black px-4 text-xs text-white hover:bg-black/75 sm:h-11 sm:px-7 sm:text-[15px]"
            >
              <Link to="/solicitar-demo">Solicitar demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative bg-[#f8b9e7] px-5 pb-12 pt-32 sm:pt-40 lg:px-10 lg:pb-16">
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

      <section className="border-b border-black/10 bg-[#fff0d8] px-5 py-8 lg:px-10">
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

      <section ref={howSectionRef} id="como-funciona" className="px-5 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-4xl">
            <h2 className="text-4xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Cómo funciona
            </h2>
          </div>
          <div className="relative -mx-5 mt-14 lg:left-1/2 lg:mx-0 lg:w-screen lg:-translate-x-1/2">
            <div
              ref={howTrackRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:none] lg:pl-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))] lg:pr-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                if (howProgrammaticRef.current) return;
                const track = event.currentTarget;
                const center = track.scrollLeft + track.clientWidth / 2;
                let nearest = 0;
                let distance = Number.POSITIVE_INFINITY;
                Array.from(track.children).forEach((child, index) => {
                  const card = child as HTMLElement;
                  const cardCenter = card.offsetLeft - track.offsetLeft + card.clientWidth / 2;
                  const nextDistance = Math.abs(center - cardCenter);
                  if (nextDistance < distance) {
                    distance = nextDistance;
                    nearest = index;
                  }
                });
                setCurrentHowStep((current) => (current === nearest ? current : nearest));
              }}
            >
              {howItWorks.map((item) => (
                <article
                  key={item.title}
                  className={cn(
                    item.color,
                    "group flex min-h-[34rem] w-[85vw] max-w-[30rem] shrink-0 snap-center flex-col rounded-[2rem] p-7 sm:p-10 lg:min-h-0 lg:w-[21.75rem] lg:max-w-[21.75rem] lg:rounded-[1.5rem] lg:p-6",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-bold lg:text-xs">{item.number} / 05</span>
                    <item.icon className="size-8 lg:size-7" />
                  </div>
                  <div className="mt-8 aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/35 lg:mt-6 lg:rounded-[1.15rem]">
                    <img
                      src={item.image}
                      alt={item.imageAlt}
                      width={800}
                      height={600}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                    />
                  </div>
                  <h3 className="mt-8 max-w-lg text-3xl font-semibold leading-tight tracking-[-.04em] lg:mt-6 lg:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-xl leading-relaxed text-black/65 lg:mt-3 lg:text-sm">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-5 lg:hidden">
            <div className="flex items-center justify-center gap-6 sm:gap-10 lg:gap-16">
              <button
                type="button"
                onClick={() => selectHowStep(currentHowStep - 1)}
                className="grid size-14 place-items-center rounded-full border border-black/20 bg-white shadow-sm transition hover:bg-black hover:text-white sm:size-16 lg:size-20"
                aria-label="Ver paso anterior"
              >
                <ArrowLeft className="size-6 lg:size-8" />
              </button>
              <p className="min-w-24 text-center text-2xl font-semibold tabular-nums sm:text-3xl lg:min-w-36 lg:text-4xl">
                {String(currentHowStep + 1).padStart(2, "0")}
                <span className="ml-2 font-normal text-black/40">
                  / {String(howItWorks.length).padStart(2, "0")}
                </span>
              </p>
              <button
                type="button"
                onClick={() => selectHowStep(currentHowStep + 1)}
                className="grid size-14 place-items-center rounded-full bg-[#f8b9e7] transition hover:bg-black hover:text-white sm:size-16 lg:size-20"
                aria-label="Ver paso siguiente"
              >
                <ArrowRight className="size-6 lg:size-8" />
              </button>
            </div>
            <div className="flex items-center gap-2.5" aria-label="Selector de pasos">
              {howItWorks.map((item, index) => (
                <button
                  key={item.number}
                  type="button"
                  onClick={() => selectHowStep(index)}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300",
                    index === currentHowStep ? "w-10 bg-[#c93c9f]" : "w-2.5 bg-black/15",
                  )}
                  aria-label={"Ir al paso " + (index + 1)}
                  aria-current={index === currentHowStep ? "step" : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff0d8] px-5 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 rounded-[2.5rem] bg-white p-7 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto] lg:p-14">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold leading-[.98] tracking-[-.05em] sm:text-6xl">
              Descubre la experiencia de tus clientes.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-black/60">
              Escanea el QR o abre el Club Café Norte para ver cómo un cliente consulta sus puntos,
              recompensas y tarjeta digital.
            </p>
            <Button asChild size="lg" className="mt-8 h-13 rounded-full bg-black px-8 text-white">
              <a href={clubExamplePath} target="_blank" rel="noreferrer">
                Ver ejemplo <ArrowRight />
              </a>
            </Button>
          </div>
          <a
            href={clubExamplePath}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir el Club Café Norte de ejemplo en una pestaña nueva"
            className="group mx-auto rounded-[2rem] bg-[#ffe65c] p-5 transition-transform hover:-translate-y-1 sm:p-7"
          >
            <div className="rounded-[1.4rem] bg-white p-4 shadow-sm">
              {clubQr ? (
                <img src={clubQr} alt="QR del Club Café Norte de ejemplo" className="size-48" />
              ) : (
                <div className="size-48 animate-pulse rounded-xl bg-black/5" />
              )}
            </div>
            <p className="mt-4 text-center text-sm font-semibold group-hover:underline">
              Escanea o pulsa el QR
            </p>
          </a>
        </div>
      </section>

      <section id="precios" className="bg-[#111] px-5 py-16 text-white lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="max-w-4xl text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-6xl">
            Un plan para cada etapa de tu negocio.
          </h2>
          <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-5 [scrollbar-width:none] lg:mx-auto lg:grid lg:max-w-[1224px] lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {subscriptionPlans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  plan.color,
                  "flex min-h-[31rem] w-[72vw] max-w-[20rem] shrink-0 snap-center flex-col rounded-[2rem] p-7 text-black sm:p-9 lg:w-auto lg:max-w-none",
                )}
              >
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
                  <Link to="/auth" search={{ tab: "signup" }}>
                    Comprar
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="negocios" className="bg-[#d9f4ff] px-5 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <h2 className="text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-6xl">
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
              <Button asChild size="lg" className="mt-9 h-13 rounded-full bg-black px-8 text-white">
                <a href={backofficeExamplePath}>
                  Ver ejemplo <ArrowRight />
                </a>
              </Button>
            </div>
            <AnalyticsPreview />
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto hidden max-w-[1440px] lg:block">
          <div className="grid grid-cols-5 gap-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} kpi={kpi} />
            ))}
          </div>
        </div>
        <div
          ref={kpiTrackRef}
          className="-mx-5 flex touch-pan-y gap-3 overflow-x-hidden px-5 pb-3 lg:hidden"
        >
          {[...kpis, ...kpis].map((kpi, index) => (
            <KpiCard
              key={kpi.label + "-" + index}
              kpi={kpi}
              compact
              ariaHidden={index >= kpis.length}
            />
          ))}
        </div>
      </section>

      <section id="testimonios" className="bg-[#f7f3ff] py-16 lg:py-20">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="max-w-4xl">
            <h2 className="text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-6xl">
              Negocios que convierten cada visita en una relación.
            </h2>
            <p className="mt-5 max-w-2xl text-black/60">
              Historias de equipos que han simplificado su fidelización y mantienen su marca en el
              móvil de sus clientes.
            </p>
          </div>
        </div>
        <div className="relative mt-14">
          <div
            ref={testimonialsTrackRef}
            className="flex touch-pan-y gap-6 overflow-x-hidden px-[max(1.25rem,calc((100vw-1440px)/2+2rem))] pb-8"
          >
            {[...testimonials, ...testimonials].map((testimonial, testimonialIndex) => (
              <article
                key={`${testimonial.name}-${testimonial.business}-${testimonialIndex}`}
                aria-hidden={testimonialIndex >= testimonials.length}
                className="grid w-[calc(100vw-2.5rem)] max-w-[44rem] shrink-0 gap-6 overflow-hidden rounded-[2rem] border border-black/[.06] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,.08)] sm:grid-cols-[11rem_1fr] sm:gap-8 sm:p-8"
              >
                <img
                  src={testimonial.image}
                  alt={`Tarjeta de fidelización de ${testimonial.name} para ${testimonial.business}`}
                  width={520}
                  height={817}
                  loading="lazy"
                  className="aspect-[7/11] h-auto w-full max-w-[12rem] place-self-center object-cover shadow-sm sm:max-w-none"
                />
                <div className="flex min-h-full flex-col py-1 sm:py-4">
                  <div className="flex gap-1" aria-label="5 de 5 estrellas">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className="size-5 fill-[#ff6b00] text-[#ff6b00]"
                        aria-hidden
                      />
                    ))}
                  </div>
                  <blockquote className="mt-6 max-w-md text-lg font-medium leading-relaxed sm:text-xl">
                    “{testimonial.quote}”
                  </blockquote>
                  <div className="mt-8 flex items-center gap-4 sm:mt-auto">
                    <span
                      className={cn(
                        "grid size-14 shrink-0 place-items-center rounded-full text-base font-bold sm:size-16 sm:text-lg",
                        testimonial.avatarClassName,
                      )}
                      aria-hidden="true"
                    >
                      {testimonial.avatar}
                    </span>
                    <div>
                      <p className="font-semibold sm:text-lg">{testimonial.name}</p>
                      <p className="mt-0.5 text-sm text-black/55">{testimonial.business}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent sm:w-28" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent sm:w-28" />
        </div>
      </section>

      <section id="preguntas" className="border-t border-black/10 px-5 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <h2 className="text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
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
              [
                "¿Puedo personalizar el club con mi marca?",
                "Sí. Puedes configurar el nombre del programa, el logo, los colores, la portada y los textos que verá el cliente.",
              ],
              [
                "¿Los puntos pueden compartirse entre locales?",
                "Sí. Puedes crear un programa común para varios establecimientos y decidir en cuáles se acumulan y canjean los puntos.",
              ],
              [
                "¿Puedo saber qué locales y campañas funcionan mejor?",
                "Sí. El backoffice muestra métricas por periodo y establecimiento para comparar actividad, recurrencia, recompensas y resultados.",
              ],
              [
                "¿Puedo limitar lo que ve cada miembro del equipo?",
                "Sí. Los permisos diferencian administradores, responsables y empleados, y pueden limitar el acceso a establecimientos concretos.",
              ],
            ].map(([question, answer]) => (
              <details key={question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                  {question}
                  <span className="text-2xl font-normal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pt-4 text-sm leading-relaxed text-black/60 sm:text-base">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="px-5 pb-5 lg:px-10 lg:pb-10">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[2.5rem] bg-[#f8b9e7] px-6 py-16 text-center sm:px-10 lg:py-24">
          <h2 className="mx-auto max-w-4xl text-5xl font-semibold leading-[.93] tracking-[-.06em] sm:text-7xl">
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
              <a href={backofficeExamplePath}>
                Ver ejemplo Backoffice <ArrowRight />
              </a>
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
              <li>
                <Link to="/solicitar-demo">Solicitar una demo</Link>
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
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event(openCookieSettingsEvent))}
                  className="text-left hover:text-white"
                >
                  Configurar cookies
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-[1440px] flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Fideleo</span>
          <span>Fidelización digital, sin fricción.</span>
        </div>
      </footer>
      <CookieConsent />
    </main>
  );
}

function KpiCard({
  kpi,
  compact = false,
  ariaHidden = false,
}: {
  kpi: (typeof kpis)[number];
  compact?: boolean;
  ariaHidden?: boolean;
}) {
  return (
    <article
      aria-hidden={ariaHidden}
      className={cn(
        kpi.color,
        "rounded-[2rem]",
        compact ? "w-[58vw] max-w-[13rem] shrink-0 p-5" : "p-7",
      )}
    >
      <kpi.icon className={compact ? "size-6" : "size-8"} />
      <p
        className={cn(
          "font-semibold tracking-[-.06em]",
          compact ? "mt-7 text-3xl" : "mt-12 text-4xl",
        )}
      >
        {kpi.value}
      </p>
      <p className={cn("mt-2", compact && "text-sm leading-snug")}>{kpi.label}</p>
    </article>
  );
}

function ProductPreview() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [walletProgress, setWalletProgress] = useState(0);
  const walletPasses = [
    {
      image: "/testimonials/bar-casa-andrea-optimized-v2.png",
      alt: "Tarjeta de fidelización de Bar Casa Andrea",
      stacked: [-70, -47, -16],
      spread: [-135, -47, -18],
    },
    {
      image: "/testimonials/latteo-coffee-optimized-v2.png",
      alt: "Tarjeta de fidelización de Latteo Coffee",
      stacked: [-60, -53, -7],
      spread: [-90, -55, -8],
    },
    {
      image: "/testimonials/peluqueria-alex-optimized-v2.png",
      alt: "Tarjeta de fidelización de Peluquería Álex",
      stacked: [-50, -56, 4],
      spread: [-45, -56, 5],
    },
    {
      image: "/testimonials/get-smashed-burger-optimized-v2.png",
      alt: "Tarjeta de fidelización de Get Smashed Burger",
      stacked: [-40, -50, 15],
      spread: [0, -47, 17],
    },
  ] as const;

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reducedMotion) {
        setWalletProgress(1);
        return;
      }

      const hero = preview.closest("section");
      if (!hero) return;
      const heroRect = hero.getBoundingClientRect();
      const range = Math.max(heroRect.height * 0.58, 1);
      const progress = Math.min(Math.max(-heroRect.top / range, 0), 1);
      setWalletProgress((current) => (Math.abs(current - progress) > 0.001 ? progress : current));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const interpolate = (start: number, end: number) => start + (end - start) * walletProgress;

  return (
    <div
      ref={previewRef}
      className="relative z-10 mx-auto h-[30rem] w-full max-w-2xl sm:h-[36rem] lg:translate-x-8"
      aria-label="Tarjetas digitales de fidelización"
    >
      <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
      <div className="relative h-full w-full">
        {walletPasses.map((pass, index) => {
          const x = interpolate(pass.stacked[0], pass.spread[0]);
          const y = interpolate(pass.stacked[1], pass.spread[1]);
          const rotation = interpolate(pass.stacked[2], pass.spread[2]);
          return (
            <img
              key={pass.image}
              src={pass.image}
              alt={pass.alt}
              width={520}
              height={817}
              className="hero-wallet-pass absolute left-1/2 top-1/2 w-[10rem] drop-shadow-[0_24px_28px_rgba(17,17,17,.22)] sm:w-[13rem]"
              style={{
                zIndex: index + 1,
                transform: `translate(${x}%, ${y}%) rotate(${rotation}deg)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reducedMotion) {
        setScrollProgress(1);
        return;
      }
      const rect = preview.getBoundingClientRect();
      const start = window.innerHeight * 0.92;
      const end = window.innerHeight * 0.28;
      const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
      setScrollProgress((current) => (Math.abs(current - progress) > 0.001 ? progress : current));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={previewRef} className="relative mx-auto w-full max-w-3xl">
      <div
        className="mx-auto max-w-[12.5rem] rounded-[2px] bg-white p-2 shadow-[0_24px_60px_rgba(17,17,17,.16)] will-change-transform lg:hidden"
        style={{
          opacity: 0.72 + scrollProgress * 0.28,
          transform: `translateY(${(1 - scrollProgress) * 20}px)`,
        }}
      >
        <div className="mb-1.5 flex items-center gap-1 px-1.5 pt-0.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-[#f8b9e7]" />
          <span className="size-1.5 rounded-full bg-[#ffe65c]" />
          <span className="size-1.5 rounded-full bg-black/15" />
        </div>
        <img
          src="/backoffice-preview/dashboard-mobile-optimized-v2.jpg"
          alt="Dashboard móvil del backoffice Fideleo con métricas y actividad reciente"
          width={387}
          height={760}
          loading="lazy"
          className="w-full rounded-[2px] border border-black/[.06]"
        />
      </div>

      <div className="relative hidden h-[31rem] lg:block">
        <div
          className="absolute inset-x-0 top-0 rounded-[2px] bg-white p-3 shadow-[0_30px_80px_rgba(17,17,17,.16)] will-change-transform"
          style={{
            opacity: 0.68 + scrollProgress * 0.32,
            transform: `translateY(${(1 - scrollProgress) * 28}px) scale(${0.97 + scrollProgress * 0.03})`,
          }}
        >
          <div className="mb-3 flex items-center gap-2 px-2 pt-1" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#f8b9e7]" />
            <span className="size-2.5 rounded-full bg-[#ffe65c]" />
            <span className="size-2.5 rounded-full bg-black/15" />
          </div>
          <img
            src="/backoffice-preview/dashboard-web-optimized-v2.jpg"
            alt="Dashboard web del backoffice Fideleo con la actividad de tres establecimientos"
            width={1600}
            height={920}
            loading="lazy"
            className="w-full rounded-[2px] border border-black/[.06]"
          />
        </div>

        <div
          className="absolute -right-5 top-24 w-[23%] rounded-[2px] bg-white p-2 shadow-[0_28px_70px_rgba(17,17,17,.24)] will-change-transform"
          style={{
            opacity: 0.58 + scrollProgress * 0.42,
            transform: `translateY(${(1 - scrollProgress) * 58}px) rotate(${(1 - scrollProgress) * 3}deg)`,
          }}
        >
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-black/10" aria-hidden="true" />
          <img
            src="/backoffice-preview/dashboard-mobile-optimized-v2.jpg"
            alt="Vista móvil del dashboard de Fideleo"
            width={387}
            height={760}
            loading="lazy"
            className="w-full rounded-[2px] border border-black/[.06]"
          />
        </div>
      </div>
    </div>
  );
}
