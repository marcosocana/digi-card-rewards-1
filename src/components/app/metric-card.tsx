import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  className,
  to,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
          {label}
        </p>
        {icon ? (
          <span className="hidden size-8 place-items-center rounded-lg bg-secondary text-primary sm:grid">
            {icon}
          </span>
        ) : null}
        {to ? (
          <ArrowUpRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:text-primary sm:hidden"
          />
        ) : null}
      </div>
      <p className="metric-value mt-2 text-lg text-foreground sm:mt-3 sm:text-3xl">{value}</p>
      {hint ? (
        <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">{hint}</p>
      ) : null}
      {to ? (
        <span className="mt-2 hidden items-center gap-1 text-xs font-semibold text-primary sm:inline-flex">
          Ver detalle
          <ArrowUpRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:-translate-x-0 group-hover:-translate-y-0.5"
          />
        </span>
      ) : null}
    </>
  );

  const classes = cn("surface group p-3 sm:p-6", to && "transition-colors hover:bg-secondary/50", className);

  if (to) {
    return (
      <Link to={to} className={cn("block", classes)}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
