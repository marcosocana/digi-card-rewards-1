import { Building2 } from "lucide-react";

export function AdminScopeNotice({ action }: { action: string }) {
  return (
    <div className="mb-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
      <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        Estás viendo todas las empresas. Selecciona uno o varios locales de una misma empresa para
        {` ${action}`}.
      </p>
    </div>
  );
}
