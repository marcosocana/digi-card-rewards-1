import { ArrowRight, LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffaf0] px-5 py-6 text-[#111] sm:px-8 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,17,17,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(17,17,17,.055) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -left-24 top-20 size-72 rounded-full bg-[#dff7ff] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-80 rounded-full bg-[#f8b9e7]/70 blur-3xl" />

      <header className="relative mx-auto flex max-w-[1280px] items-center justify-between">
        <Link to="/" aria-label="Fideleo, volver al inicio">
          <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-8 w-auto" />
        </Link>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
        >
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Iniciar sesión</span>
        </Link>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-[1180px] items-center gap-10 py-12 lg:grid-cols-[1fr_.85fr] lg:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold uppercase tracking-[.24em] text-[#c93c9f]">
            Error 404
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-[.92] tracking-[-.06em] sm:text-7xl">
            Esta visita no suma puntos.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-black/60">
            La página que buscas ha cambiado de sitio o ya no está disponible. Puedes volver al
            inicio y seguir descubriendo cómo convertir visitas en clientes habituales.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
            >
              Volver al inicio <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/solicitar-demo"
              className="inline-flex items-center rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-bold transition hover:-translate-y-0.5"
            >
              Solicitar una demo
            </Link>
          </div>
        </div>

        <div className="relative mx-auto h-[22rem] w-full max-w-[30rem] sm:h-[28rem]" aria-hidden>
          <div className="absolute left-[5%] top-[13%] grid aspect-[.72] w-[36%] -rotate-12 place-items-center rounded-[1.75rem] border-2 border-black bg-[#ffe65c] shadow-[8px_10px_0_#111]">
            <span className="text-7xl font-extrabold tracking-[-.1em] sm:text-8xl">4</span>
          </div>
          <div className="absolute left-[34%] top-[4%] grid aspect-[.72] w-[36%] rotate-3 place-items-center rounded-[1.75rem] border-2 border-black bg-[#dff7ff] shadow-[8px_10px_0_#111]">
            <span className="size-20 rounded-full border-[14px] border-black sm:size-24" />
          </div>
          <div className="absolute right-[1%] top-[18%] grid aspect-[.72] w-[36%] rotate-12 place-items-center rounded-[1.75rem] border-2 border-black bg-[#f8b9e7] shadow-[8px_10px_0_#111]">
            <span className="text-7xl font-extrabold tracking-[-.1em] sm:text-8xl">4</span>
          </div>
          <svg
            viewBox="0 0 180 70"
            className="absolute bottom-[4%] left-[24%] w-[52%] -rotate-3"
            fill="none"
          >
            <path
              d="M7 45C45 8 102 10 171 35M18 58C64 34 112 33 158 47"
              stroke="#111"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>
    </main>
  );
}
