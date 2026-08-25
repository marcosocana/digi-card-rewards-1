import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#fff8fc] px-5 py-12 text-[#111]">
      <div className="absolute -left-24 top-16 size-72 rounded-full bg-[#dff7ff] blur-2xl" />
      <div className="absolute -right-20 bottom-10 size-80 rounded-full bg-[#f8b9e7]/65 blur-2xl" />
      <section className="relative w-full max-w-2xl rounded-[2.25rem] border border-black/10 bg-white p-8 text-center shadow-[0_24px_80px_-35px_rgba(0,0,0,.28)] sm:p-12">
        <Link to="/" aria-label="Fideleo, volver al inicio" className="inline-flex">
          <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-8 w-auto" />
        </Link>
        <p className="mt-10 text-sm font-extrabold uppercase tracking-[.24em] text-primary">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">
          Esta página se nos ha escapado.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-black/60">
          El enlace puede haber cambiado o ya no estar disponible. Puedes volver al inicio,
          solicitar una demo o acceder a tu cuenta.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-[#111] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Volver al inicio
          </Link>
          <Link
            to="/solicitar-demo"
            className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-bold transition-colors hover:bg-black/5"
          >
            Solicitar una demo
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-bold transition-colors hover:bg-black/5"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No hemos podido cargar esta página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ha ocurrido un error inesperado. Puedes volver a intentarlo o regresar al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver a intentarlo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Fideleo — Fidelización digital para negocios" },
      {
        name: "description",
        content:
          "Plataforma de fidelización para cafeterías, bares y restaurantes: puntos por gasto, recompensas y tarjeta digital en Wallet.",
      },
      { property: "og:title", content: "Fideleo — Fidelización digital" },
      {
        property: "og:description",
        content: "Programas de puntos con tarjeta en Apple Wallet y Google Wallet, sin app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/isotipo.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
