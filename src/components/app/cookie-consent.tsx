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
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-2xl border border-black/15 bg-white p-3 text-black shadow-xl sm:p-4"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ffe65c]">
                  <Cookie className="size-4" />
                </span>
                <h2 className="text-sm font-semibold">Tu privacidad, bajo tu control</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-black/60">
                Usamos cookies necesarias. Las opcionales solo se activan con tu permiso.{" "}
              </p>
              <Link
                to="/legal/$document"
                params={{ document: "cookies" }}
                className="mt-1 inline-block text-xs font-semibold underline underline-offset-4"
              >
                Ver política de cookies
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5 md:max-w-[19rem] md:justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => save(optionalDisabled)}
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="size-3.5" /> Configurar
              </Button>
              <Button
                size="sm"
                className="h-8 bg-black px-3 text-xs text-white hover:bg-black/75"
                onClick={() => save({ analytics: true, preferences: true, marketing: true })}
              >
                Aceptar
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
