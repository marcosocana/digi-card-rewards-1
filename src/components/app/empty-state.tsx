import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h3 className="font-display text-lg font-semibold">{t(title)}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{t(description)}</p>
      ) : null}
      {action}
    </div>
  );
}
