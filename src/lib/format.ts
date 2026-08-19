export const eur = (cents: number | null | undefined) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format((cents ?? 0) / 100);

export const num = (n: number | null | undefined) => new Intl.NumberFormat("es-ES").format(n ?? 0);

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

export const dateOnly = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso)) : "—";

export const txnLabel: Record<string, string> = {
  purchase: "Compra",
  redemption: "Canje",
  manual_adjustment: "Ajuste manual",
  reversal: "Anulación",
  initial_bonus: "Saldo inicial",
  expiry: "Caducidad",
};

export const roleLabel: Record<string, string> = {
  admin: "Administrador",
  manager: "Responsable",
  staff: "Empleado",
};

export const errorLabel = (message: string) => {
  const map: Record<string, string> = {
    TOKEN_NOT_FOUND: "QR no reconocido. Prueba con el código corto de la tarjeta.",
    TOKEN_REVOKED: "Esta tarjeta ha sido revocada.",
    MEMBERSHIP_SUSPENDED: "La membresía del cliente está suspendida.",
    PROGRAM_PAUSED: "El programa de fidelización está pausado.",
    LOCATION_NOT_PARTICIPATING: "Este establecimiento no participa en el programa.",
    NO_LOCATION_ACCESS: "No tienes permisos en este establecimiento.",
    INSUFFICIENT_POINTS: "Saldo insuficiente para esta recompensa.",
    REWARD_NOT_AVAILABLE: "La recompensa no está disponible aquí.",
    INVALID_AMOUNT: "Introduce un importe válido mayor que cero.",
    AMOUNT_TOO_LARGE: "El importe supera el máximo permitido (10.000 €).",
    NOT_AUTHORIZED: "No tienes permisos para esta acción.",
    ALREADY_REVERSED: "Esta operación ya fue anulada.",
    REASON_REQUIRED: "Debes indicar un motivo.",
    MEMBERSHIP_NOT_FOUND: "No se encontró la membresía.",
    PROGRAM_NOT_AVAILABLE: "El programa no está disponible.",
    TERMS_REQUIRED: "Debes aceptar las condiciones y la política de privacidad.",
    INVALID_EMAIL: "Introduce un email válido.",
    INVALID_PHONE: "Introduce un teléfono válido.",
    NAME_REQUIRED: "Introduce tu nombre.",
  };
  for (const key of Object.keys(map)) if (message.includes(key)) return map[key]!;
  return message;
};

export const parseAmountToCents = (value: string): number | null => {
  const clean = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
};

export const computePoints = (
  amountCents: number,
  mode: string,
  value: number,
  rounding: string,
): number => {
  const raw =
    mode === "points_per_currency_unit"
      ? (amountCents / 100) * value
      : amountCents / 100 / (value || 1);
  return rounding === "nearest" ? Math.round(raw) : Math.floor(raw);
};

export const ruleText = (mode: string, value: number) =>
  mode === "points_per_currency_unit"
    ? `1 € = ${value} ${value === 1 ? "punto" : "puntos"}`
    : `${value} € = 1 punto`;
