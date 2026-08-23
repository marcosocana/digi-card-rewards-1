import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{t(title)}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{t(description)}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
