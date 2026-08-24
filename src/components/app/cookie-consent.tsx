import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const consentKey = "fideleo:cookie-consent:v1";
export const openCookieSettingsEvent = "fideleo:open-cookie-settings";

type OptionalConsent = {
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
};

type StoredConsent = OptionalConsent & {
  necessary: true;
  savedAt: string;
  version: 1;
};

const optionalDisabled: OptionalConsent = {
  analytics: false,
  preferences: false,
  marketing: false,
};

const readConsent = (): StoredConsent | null => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(consentKey) ?? "null");
    return stored?.version === 1 && stored?.necessary === true ? stored : null;
  } catch {
    return null;
  }
};

export function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<OptionalConsent>(optionalDisabled);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      setPreferences({
        analytics: stored.analytics,
        preferences: stored.preferences,
        marketing: stored.marketing,
      });
    } else {
      setBannerOpen(true);
    }
    setReady(true);

    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(openCookieSettingsEvent, openSettings);
    return () => window.removeEventListener(openCookieSettingsEvent, openSettings);
  }, []);

  const save = (next: OptionalConsent) => {
    const consent: StoredConsent = {
      necessary: true,
      ...next,
      savedAt: new Date().toISOString(),
      version: 1,
    };
    window.localStorage.setItem(consentKey, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("fideleo:cookie-consent-changed", { detail: consent }));
    setPreferences(next);
    setBannerOpen(false);
    setSettingsOpen(false);
  };

  if (!ready) return null;

  return (
    <>
      {bannerOpen ? (
        <aside
          aria-label="Consentimiento de cookies"
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-5xl rounded-[1.6rem] border border-black/15 bg-white p-5 text-black shadow-2xl sm:bottom-5 sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <span className="grid size-10 place-items-center rounded-full bg-[#ffe65c]">
                <Cookie className="size-5" />
              </span>
              <h2 className="mt-3 text-xl font-semibold">Tu privacidad, bajo tu control</h2>
              <p className="mt-2 text-sm leading-relaxed text-black/65">
                Usamos almacenamiento necesario para que Fideleo funcione. Solo activaremos
                analítica, personalización o marketing si nos das permiso. Puedes cambiar tu
                elección en cualquier momento desde el pie de página.
              </p>
              <Link
                to="/legal/$document"
                params={{ document: "cookies" }}
                className="mt-2 inline-block text-sm font-semibold underline underline-offset-4"
              >
                Ver política de cookies
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[29rem]">
              <Button variant="outline" onClick={() => save(optionalDisabled)}>
                Rechazar opcionales
              </Button>
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="size-4" /> Configurar
              </Button>
              <Button
                className="bg-black text-white hover:bg-black/75"
                onClick={() => save({ analytics: true, preferences: true, marketing: true })}
              >
                Aceptar todas
              </Button>
            </div>
          </div>
        </aside>
      ) : null}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Configurar cookies</DialogTitle>
            <DialogDescription>
              Las categorías opcionales permanecen desactivadas hasta que guardes tu consentimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-2xl border">
            <ConsentRow
              checked
              disabled
              title="Necesarias"
              description="Sesión, seguridad, navegación y recuerdo de tu elección. Siempre activas."
            />
            <ConsentRow
              checked={preferences.preferences}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, preferences: checked }))
              }
              title="Preferencias"
              description="Recuerdan opciones no esenciales para personalizar la experiencia."
            />
            <ConsentRow
              checked={preferences.analytics}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, analytics: checked }))
              }
              title="Analítica"
              description="Nos ayudan a entender el uso agregado de la web y mejorarla."
            />
            <ConsentRow
              checked={preferences.marketing}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, marketing: checked }))
              }
              title="Marketing"
              description="Permiten medir campañas y mostrar comunicaciones más relevantes."
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => save(optionalDisabled)}>
              Rechazar opcionales
            </Button>
            <Button onClick={() => save(preferences)}>Guardar preferencias</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConsentRow({
  checked,
  disabled = false,
  title,
  description,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 p-4 has-[:disabled]:cursor-default">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
        aria-label={title}
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}
