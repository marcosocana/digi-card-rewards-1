import { cn } from "@/lib/utils";

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
    <div
      className="mb-4 grid w-full max-w-2xl grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-xl border bg-card"
      role="radiogroup"
      aria-label="Tipo de programa"
    >
      <span className="flex items-center px-3 py-3 text-xs font-medium sm:px-5 sm:text-sm">
        Tipo de programa
      </span>
      {(
        [
          ["points", "Puntos"],
          ["stamps", "Sellos"],
        ] as const
      ).map(([mechanic, label]) => {
        const selected = value === mechanic;
        return (
          <button
            key={mechanic}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(mechanic)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 border-l px-2 py-3 text-xs font-semibold transition-colors sm:px-5 sm:text-sm",
              selected
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-primary" : "border-muted-foreground/50",
              )}
            >
              {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
            </span>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
