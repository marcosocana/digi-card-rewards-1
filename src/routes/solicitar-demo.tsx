import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/solicitar-demo")({
  validateSearch: (search: Record<string, unknown>) => ({
    plan: typeof search.plan === "string" ? search.plan : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Solicitar una demo — Fideleo" },
      {
        name: "description",
        content:
          "Cuéntanos sobre tu negocio y descubre cómo Fideleo puede ayudarte a fidelizar clientes.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.fideleo.store/solicitar-demo" }],
  }),
  component: DemoPage,
});

function DemoPage() {
  const { plan } = Route.useSearch();
  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    phone: "",
    message: plan ? `Me interesa el plan ${plan}.` : "",
    website: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        "send-demo-request",
        { body: form },
      );
      if (error) {
        let message = error.message;
        const context = (error as { context?: unknown }).context;
        if (context instanceof Response) {
          const result = (await context
            .clone()
            .json()
            .catch(() => null)) as {
            error?: string;
          } | null;
          message = result?.error ?? message;
        }
        throw new Error(message);
      }
      if (!data?.ok) throw new Error(data?.error ?? "No se pudo enviar la solicitud");
      setSent(true);
      toast.success("Solicitud enviada", { description: "Te responderemos en horario laboral." });
    } catch (error) {
      toast.error("No se pudo enviar la solicitud", {
        description: error instanceof Error ? error.message : "Inténtalo de nuevo más tarde.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8b9e7] px-5 py-6 text-[#111] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="Volver al inicio">
            <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-8 w-auto" />
          </Link>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/">
              <ArrowLeft /> Volver
            </Link>
          </Button>
        </header>

        <div className="grid gap-10 py-14 lg:grid-cols-[.85fr_1.15fr] lg:items-start lg:py-20">
          <section>
            <p className="text-xs font-bold uppercase tracking-[.18em]">Hablemos</p>
            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[.92] tracking-[-.06em] sm:text-7xl">
              Tu próximo cliente habitual empieza aquí.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-black/65">
              Cuéntanos un poco sobre tu negocio. Te enseñaremos Fideleo aplicado a tu caso y
              resolveremos todas tus dudas.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <a
                href="tel:+34695834018"
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white/45 p-4 transition hover:bg-white/70"
              >
                <span className="grid size-11 place-items-center rounded-full bg-black text-white">
                  <Phone className="size-5" />
                </span>
                <span>
                  <strong className="block">Llámanos</strong>
                  <span className="text-sm text-black/60">695 83 40 18</span>
                </span>
              </a>
              <a
                href="https://wa.me/34695834018?text=Hola%20Fideleo%2C%20me%20gustaría%20solicitar%20una%20demo"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white/45 p-4 transition hover:bg-white/70"
              >
                <span className="grid size-11 place-items-center rounded-full bg-[#25D366] text-white">
                  <MessageCircle className="size-5" />
                </span>
                <span>
                  <strong className="block">WhatsApp</strong>
                  <span className="text-sm text-black/60">Respuesta directa</span>
                </span>
              </a>
              <a
                href="mailto:Fideleo.app@gmail.com"
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white/45 p-4 transition hover:bg-white/70"
              >
                <span className="grid size-11 place-items-center rounded-full bg-white">
                  <Mail className="size-5" />
                </span>
                <span>
                  <strong className="block">Escríbenos</strong>
                  <span className="text-sm text-black/60">Fideleo.app@gmail.com</span>
                </span>
              </a>
              <div className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white/45 p-4">
                <span className="grid size-11 place-items-center rounded-full bg-white">
                  <Clock3 className="size-5" />
                </span>
                <span>
                  <strong className="block">Horario</strong>
                  <span className="text-sm text-black/60">L–V, de 8:00 a 19:00</span>
                </span>
              </div>
            </div>
          </section>

          <form
            onSubmit={submit}
            className="rounded-[2rem] bg-white p-6 shadow-[0_25px_80px_rgba(0,0,0,.12)] sm:p-9"
          >
            <h2 className="text-2xl font-semibold">Solicita tu demo</h2>
            <p className="mt-2 text-sm text-black/55">Te responderemos en horario laboral.</p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className="absolute -left-[10000px]" aria-hidden="true">
                <Label htmlFor="website">Web</Label>
                <Input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business">Negocio *</Label>
                <Input
                  id="business"
                  required
                  value={form.business}
                  onChange={(e) => setForm({ ...form, business: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="message">¿En qué podemos ayudarte?</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={sending || sent}
              className="mt-6 w-full rounded-full bg-black text-white hover:bg-black/75"
            >
              {sending ? (
                <>
                  Enviando… <LoaderCircle className="animate-spin" />
                </>
              ) : sent ? (
                <>
                  Solicitud enviada <CheckCircle2 />
                </>
              ) : (
                <>
                  Enviar solicitud <Mail />
                </>
              )}
            </Button>
            <p className="mt-4 text-center text-xs text-black/45">
              Recibiremos tu solicitud por email y te responderemos en horario laboral.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
