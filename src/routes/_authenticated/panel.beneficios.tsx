import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gift, Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminScope } from "@/lib/session";
import { dateOnly, eur, num } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/app/brand-loader";
import { AdminScopeNotice } from "@/components/app/admin-scope-notice";

export const Route = createFileRoute("/_authenticated/panel/beneficios")({
  component: BeneficiosPage,
});

function BeneficiosPage() {
  const { session, organizationId: orgId, isSuperadmin, isGlobal, canMutate } = useAdminScope();
  const [couponOpen, setCouponOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [coupon, setCoupon] = useState({
    title: "",
    code: "",
    type: "percentage",
    value: 20,
    maximum: "",
  });
  const [gift, setGift] = useState({ amount: "25", recipient_name: "", recipient_email: "" });
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["benefits", orgId, isSuperadmin],
    enabled: Boolean(session && (orgId || isSuperadmin)),
    queryFn: async () => {
      let couponsQuery = supabase
        .from("coupons")
        .select("*, organizations(display_name)")
        .order("created_at", { ascending: false });
      let cardsQuery = supabase
        .from("gift_cards")
        .select(
          "id,public_id,code_hint,initial_balance_cents,remaining_balance_cents,recipient_name,recipient_email,expires_at,status,created_at,organizations(display_name)",
        )
        .order("created_at", { ascending: false });
      if (orgId) {
        couponsQuery = couponsQuery.eq("organization_id", orgId);
        cardsQuery = cardsQuery.eq("organization_id", orgId);
      }
      const [coupons, cards] = await Promise.all([couponsQuery, cardsQuery]);
      if (coupons.error) throw coupons.error;
      if (cards.error) throw cards.error;
      return { coupons: coupons.data ?? [], cards: cards.data ?? [] };
    },
  });
  const createCoupon = async () => {
    if (!orgId || coupon.title.trim().length < 2 || coupon.code.trim().length < 3) {
      toast.error("Revisa el título y el código");
      return;
    }
    const { error } = await supabase.from("coupons").insert({
      organization_id: orgId,
      title: coupon.title.trim(),
      code: coupon.code.trim().toUpperCase(),
      discount_type: coupon.type as "percentage",
      discount_value: coupon.value,
      maximum_uses: coupon.maximum ? Number(coupon.maximum) : null,
      status: "active",
    });
    if (error) {
      toast.error("No se pudo crear", { description: error.message });
      return;
    }
    toast.success("Cupón activado");
    setCouponOpen(false);
    setCoupon({ title: "", code: "", type: "percentage", value: 20, maximum: "" });
    void refetch();
  };
  const issueGift = async () => {
    if (!orgId) return;
    const cents = Math.round(Number(gift.amount.replace(",", ".")) * 100);
    const { data: result, error } = await supabase.rpc("issue_gift_card", {
      _organization_id: orgId,
      _initial_balance_cents: cents,
      ...(gift.recipient_name ? { _recipient_name: gift.recipient_name } : {}),
      ...(gift.recipient_email ? { _recipient_email: gift.recipient_email } : {}),
    });
    if (error) {
      toast.error("No se pudo emitir", { description: error.message });
      return;
    }
    const response = result as { code: string };
    setIssuedCode(response.code);
    toast.success("Tarjeta regalo emitida");
    void refetch();
  };
  if (isLoading) return <PageSkeleton variant="cards" />;
  return (
    <>
      <PageHeader
        title="Cupones y tarjetas regalo"
        description="Beneficios monetarios con uso, saldo e historial controlados en backend."
      />
      {isGlobal ? <AdminScopeNotice action="crear beneficios para esa empresa" /> : null}
      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons">Cupones</TabsTrigger>
          <TabsTrigger value="gift">Tarjetas regalo</TabsTrigger>
        </TabsList>
        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canMutate}>
                  <Plus className="size-4" /> Nuevo cupón
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo cupón</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Título</Label>
                    <Input
                      value={coupon.title}
                      onChange={(e) => setCoupon({ ...coupon, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Código</Label>
                    <Input
                      className="font-mono uppercase"
                      value={coupon.code}
                      onChange={(e) => setCoupon({ ...coupon, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={coupon.type}
                      onValueChange={(value) => setCoupon({ ...coupon, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje</SelectItem>
                        <SelectItem value="fixed_amount">Importe fijo en céntimos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      min="1"
                      value={coupon.value}
                      onChange={(e) => setCoupon({ ...coupon, value: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Usos máximos (opcional)</Label>
                    <Input
                      type="number"
                      value={coupon.maximum}
                      onChange={(e) => setCoupon({ ...coupon, maximum: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => void createCoupon()}>Crear cupón</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(data?.coupons ?? []).map((item) => (
              <article key={item.id} className="surface p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <TicketPercent className="mb-2 size-5 text-primary" />
                    <h2 className="font-display text-lg font-semibold">{item.title}</h2>
                    <p className="font-mono text-sm">{item.code}</p>
                    {isSuperadmin ? (
                      <p className="text-xs text-muted-foreground">
                        {(item.organizations as { display_name: string } | null)?.display_name ??
                          "Sin empresa"}
                      </p>
                    ) : null}
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {item.discount_type === "percentage"
                    ? `${item.discount_value}% de descuento`
                    : `${eur(item.discount_value)}`}{" "}
                  · {num(item.used_count)} usos
                  {item.maximum_uses ? ` de ${num(item.maximum_uses)}` : ""}
                </p>
              </article>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="gift" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={giftOpen}
              onOpenChange={(value) => {
                setGiftOpen(value);
                if (!value) setIssuedCode(null);
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={!canMutate}>
                  <Gift className="size-4" /> Emitir tarjeta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Emitir tarjeta regalo</DialogTitle>
                </DialogHeader>
                {issuedCode ? (
                  <div className="rounded-xl bg-secondary p-5 text-center">
                    <p className="text-sm font-medium">Código generado</p>
                    <p className="mt-3 break-all font-mono text-xl tracking-wider">{issuedCode}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Cópialo ahora. Por seguridad solo volverá a mostrarse parcialmente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Saldo inicial (€)</Label>
                      <Input
                        inputMode="decimal"
                        value={gift.amount}
                        onChange={(e) => setGift({ ...gift, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Destinatario</Label>
                      <Input
                        value={gift.recipient_name}
                        onChange={(e) => setGift({ ...gift, recipient_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email del destinatario</Label>
                      <Input
                        type="email"
                        value={gift.recipient_email}
                        onChange={(e) => setGift({ ...gift, recipient_email: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  {!issuedCode ? (
                    <Button onClick={() => void issueGift()}>Emitir</Button>
                  ) : (
                    <Button onClick={() => setGiftOpen(false)}>Cerrar</Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="surface divide-y overflow-hidden">
            {(data?.cards ?? []).map((card) => (
              <div key={card.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-mono text-sm font-medium">{card.code_hint}</p>
                  <p className="text-xs text-muted-foreground">
                    {card.recipient_name || "Sin destinatario"} · Emitida{" "}
                    {dateOnly(card.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{eur(card.remaining_balance_cents)}</p>
                  <Badge variant="secondary">{card.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
