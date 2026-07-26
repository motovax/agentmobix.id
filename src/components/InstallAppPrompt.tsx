import { useEffect, useState } from "react";
import {
  isAndroidDevice,
  isIosDevice,
  isStandaloneMode,
} from "../lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const ios = isIosDevice(navigator.userAgent, navigator.platform);
    const android = isAndroidDevice(navigator.userAgent);
    if (ios) setShowIosHelp(true);
    if (android) setShowAndroidHelp(true);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setShowIosHelp(false);
      setShowAndroidHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (
    dismissed ||
    (!installEvent && !showIosHelp && !showAndroidHelp) ||
    isStandaloneMode()
  ) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) {
      setShowManualSteps(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  };

  return (
    <aside
      aria-label="Pasang aplikasi Agen Mobix"
      className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-[10000] w-[calc(100%-24px)] max-w-[388px] -translate-x-1/2 rounded-[18px] border border-white/10 bg-ink px-4 py-3.5 text-white shadow-[0_16px_48px_rgba(14,27,30,0.35)]"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup ajakan instalasi"
        className="absolute right-2.5 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-lg leading-none text-white/75"
      >
        ×
      </button>
      <div className="flex gap-3 pr-7">
        <img
          src="/mobix-logo.png"
          alt=""
          className="h-11 w-11 flex-shrink-0 rounded-xl bg-white object-contain"
        />
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold">Pasang Agen Mobix</div>
          <p className="m-0 mt-1 text-[11px] leading-[1.5] text-white/70">
            Akses katalog lebih cepat langsung dari layar utama smartphone.
          </p>
          {(installEvent || showIosHelp || showAndroidHelp) && (
            <button
              type="button"
              onClick={install}
              className="mt-2 rounded-[10px] bg-teal px-3 py-2 text-[11px] font-extrabold text-ink"
            >
              Tambahkan ke layar utama
            </button>
          )}
          {showManualSteps && (
            <div
              role="status"
              className="mt-2 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] leading-[1.55] text-white/85"
            >
              {showIosHelp ? (
                <>
                  Ketuk ikon <strong>Bagikan</strong> di Safari, lalu pilih{" "}
                  <strong>Tambahkan ke Layar Utama</strong>.
                </>
              ) : (
                <>
                  Buka menu browser <strong>⋮</strong>, lalu pilih{" "}
                  <strong>Instal aplikasi</strong> atau{" "}
                  <strong>Tambahkan ke layar utama</strong>.
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
