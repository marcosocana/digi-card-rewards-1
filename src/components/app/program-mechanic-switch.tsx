import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export type ProgramMechanic = "points" | "stamps";

export function ProgramMechanicSwitch({
  value,
  onChange,
  disabled = false,
}: {
  value: ProgramMechanic;
  onChange: (value: ProgramMechanic) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border bg-card p-3 sm:w-fit">
      <span className="pl-1 text-sm font-medium">Tipo de programa</span>
      <div className="flex items-center gap-3 rounded-full bg-muted px-3 py-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("points")}
          className={cn(
            "text-sm font-semibold transition",
            value === "points" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Puntos
        </button>
        <Switch
          checked={value === "stamps"}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked ? "stamps" : "points")}
          aria-label="Cambiar entre puntos y sellos"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("stamps")}
          className={cn(
            "text-sm font-semibold transition",
            value === "stamps" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          Sellos
        </button>
      </div>
    </div>
  );
}
