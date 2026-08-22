import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Package, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/panel/tienda")({ component: TiendaPage });

const products = [
  {
    id: "qr-table",
    name: "Expositor QR de mesa",
    price: 19.9,
    detail: "Soporte rígido para colocar Fideleo en mesas y barra.",
    color: "bg-[#dff7ff]",
  },
  {
    id: "qr-sticker",
    name: "Pack de adhesivos QR",
    price: 12.5,
    detail: "Diez adhesivos resistentes para escaparate, carta o mostrador.",
    color: "bg-[#f3e9ff]",
  },
  {
    id: "counter",
    name: "Cartel de mostrador",
    price: 24.9,
    detail: "Cartel personalizado con tu marca y una llamada a la acción.",
    color: "bg-[#fff0d8]",
  },
  {
    id: "cards",
    name: "Tarjetas informativas",
    price: 29.9,
    detail: "Pack de 100 tarjetas para entregar con la cuenta.",
    color: "bg-[#e7f8ed]",
  },
  {
    id: "staff",
    name: "Kit para el equipo",
    price: 39.9,
    detail: "Materiales para explicar el club y agilizar el registro.",
    color: "bg-[#ffd9ee]",
  },
  {
    id: "window",
    name: "Vinilo de escaparate",
    price: 34.9,
    detail: "Vinilo removible para dar visibilidad al club desde la calle.",
    color: "bg-[#ffe65c]",
  },
] as const;

function TiendaPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const units = useMemo(
    () => Object.values(quantities).reduce((sum, value) => sum + value, 0),
    [quantities],
  );
  const total = useMemo(
    () => products.reduce((sum, product) => sum + (quantities[product.id] ?? 0) * product.price, 0),
    [quantities],
  );
  const change = (id: string, delta: number) =>
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(99, (current[id] ?? 0) + delta)),
    }));

  return (
    <>
      <PageHeader
        title="Tienda"
        description="Materiales para dar visibilidad a tu club en cada punto de contacto."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const quantity = quantities[product.id] ?? 0;
          return (
            <article key={product.id} className="surface flex min-h-96 flex-col overflow-hidden">
              <div className={`${product.color} grid h-44 place-items-center`}>
                <Package className="size-12 text-foreground/70" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-bold">{product.name}</h2>
                  <strong className="shrink-0">
                    {product.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </strong>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {product.detail}
                </p>
                <div className="mt-auto flex items-center justify-between pt-6">
                  <span className="text-xs font-medium text-muted-foreground">Unidades</span>
                  <div className="flex items-center gap-2 rounded-full border bg-background p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-full"
                      aria-label={`Quitar una unidad de ${product.name}`}
                      onClick={() => change(product.id, -1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm font-semibold">{quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-full"
                      aria-label={`Añadir una unidad de ${product.name}`}
                      onClick={() => change(product.id, 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="surface sticky bottom-4 flex flex-col gap-4 p-5 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {units} {units === 1 ? "unidad" : "unidades"}
          </p>
          <p className="text-2xl font-bold">
            {total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
          </p>
        </div>
        <Button
          size="lg"
          disabled={!units}
          onClick={() =>
            toast.info("Compra próximamente", {
              description: "El pedido quedará conectado a Stripe en una siguiente fase.",
            })
          }
        >
          <ShoppingBag /> Comprar
        </Button>
      </div>
    </>
  );
}
