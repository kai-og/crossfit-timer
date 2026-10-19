import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "install-hint-dismissed-v1";

const noopSubscribe = () => () => {};

/** True when the page is already running as an installed app (Android/desktop display-mode, or iOS standalone). */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch support.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/**
 * True when the page runs as an installed app (Android/desktop PWA, or iPhone home-screen app) rather than in a
 * browser tab. In that case the browser's own full screen is already covered, so the Full screen button is not needed.
 */
export function useStandalone(): boolean {
  return useSyncExternalStore(noopSubscribe, isStandalone, () => false);
}

export type InstallState =
  | { kind: "hidden" }
  | { kind: "prompt"; install: () => void; dismiss: () => void }
  | { kind: "ios"; dismiss: () => void };

/**
 * What the phone can do to put this app on the home screen:
 * - Android/Chrome: a real install prompt we can trigger from a button.
 * - iPhone/iPad Safari: no prompt exists, so show the Share -> Add to Home Screen steps.
 * - Already installed, or dismissed: nothing.
 */
export function useInstall(): InstallState {
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => true);
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);
  const dismissedStored = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissedNow(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not persisted (private mode): the hint just shows again next visit.
    }
  }, []);

  const install = useCallback(() => {
    if (!deferred) return;
    void deferred.prompt();
    void deferred.userChoice.finally(() => setDeferred(null));
  }, [deferred]);

  if (standalone || dismissedStored || dismissedNow) return { kind: "hidden" };
  if (deferred) return { kind: "prompt", install, dismiss };
  if (ios) return { kind: "ios", dismiss };
  return { kind: "hidden" };
}
