import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "starting" | "running" | "denied" | "unsupported";

export function QrScanner({ onResult, active }: { onResult: (value: string) => void; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [state, setState] = useState<State>("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (ctx && canvas.width && canvas.height) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            stop();
            onResult(code.data.trim());
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      setState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("running");
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setState("denied");
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, attempt, onResult]);

  if (!active) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-foreground/90">
      <div className="relative aspect-square w-full">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-3/5 w-3/5 rounded-2xl border-4 border-accent/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {state !== "running" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/85 p-6 text-center text-background">
            {state === "denied" || state === "unsupported" ? (
              <>
                <CameraOff aria-hidden className="size-8" />
                <p className="text-sm">
                  {state === "denied"
                    ? "No hemos podido acceder a la cámara. Revisa los permisos del navegador."
                    : "Este dispositivo no permite usar la cámara."}
                </p>
                <Button variant="secondary" size="sm" onClick={() => setAttempt((a) => a + 1)}>
                  Reintentar
                </Button>
                <p className="text-xs opacity-80">También puedes introducir el código corto manualmente.</p>
              </>
            ) : (
              <>
                <Camera aria-hidden className="size-8 animate-pulse" />
                <p className="text-sm">Iniciando cámara…</p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
