import { useEffect, useState } from "react";

/** True once a service worker is active and has cached the timer shell, i.e. the page will open with no signal. */
export function useOfflineReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then(() => caches.match("/t"))
      .then((hit) => {
        if (!cancelled && hit) setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
