export function WhatsAppFloating({
  message = "Hola, estoy interesado en Fideleo. ¿Podéis ayudarme?",
}: {
  message?: string;
}) {
  return (
    <a
      href={`https://wa.me/34695834018?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hablar con Fideleo por WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3"
    >
      <span className="hidden items-center rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#111] shadow-lg ring-1 ring-black/5 sm:inline-flex">
        ¿Hablamos por WhatsApp?
      </span>
      <span className="relative flex size-16 items-center justify-center rounded-full bg-[#4FCE5D] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.65)] transition-transform duration-200 group-hover:scale-[1.06] group-focus-visible:scale-[1.06]">
        <svg
          viewBox="0 0 32 32"
          className="size-10 fill-white"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M16 3a12.8 12.8 0 0 0-11 19.36L3.2 29l6.8-1.78A12.8 12.8 0 1 0 16 3Zm0 23.3a10.45 10.45 0 0 1-5.33-1.46l-.38-.22-4.04 1.06 1.08-3.94-.25-.4A10.5 10.5 0 1 1 16 26.3Zm5.76-7.85c-.32-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.31-.16-1.33-.49-2.53-1.56a9.5 9.5 0 0 1-1.75-2.18c-.18-.32-.02-.49.14-.65.14-.14.31-.37.47-.55.16-.19.21-.32.32-.53.1-.21.05-.4-.03-.55-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.4-.29.31-1.11 1.08-1.11 2.64s1.14 3.07 1.29 3.28c.16.21 2.24 3.42 5.43 4.8.76.32 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.87-.77 2.14-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37Z" />
        </svg>
      </span>
    </a>
  );
}
