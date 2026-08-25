import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function BrandLoader({ fullscreen = true }: { fullscreen?: boolean }) {
  return (
    <div
      className={cn(
        "grid place-items-center bg-background px-6",
        fullscreen ? "min-h-screen" : "min-h-72 rounded-2xl",
      )}
      role="status"
      aria-live="polite"
      aria-label="Cargando Fideleo"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="brand-loader-mark relative grid size-20 place-items-center rounded-[1.6rem] border bg-card shadow-lg">
          <img src="/isotipo.svg" alt="" className="size-11" aria-hidden="true" />
          <span className="brand-loader-dot absolute -right-1 -top-1 size-4 rounded-full bg-primary" />
        </div>
        <img src="/logo.svg" alt="Fideleo" width={210} height={47} className="h-7 w-auto" />
        <span className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">
          Cargando
        </span>
      </div>
    </div>
  );
}

export function PageSkeleton({
  variant = "list",
  rows = 5,
}: {
  variant?: "list" | "cards" | "form" | "detail";
  rows?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando contenido">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-lg" />
      </div>
      {variant === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: Math.max(4, rows) }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : variant === "form" ? (
        <div className="surface grid gap-5 p-6 sm:grid-cols-2">
          {Array.from({ length: Math.max(6, rows) }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : variant === "detail" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}
      <span className="sr-only">Cargando contenido…</span>
    </div>
  );
}
