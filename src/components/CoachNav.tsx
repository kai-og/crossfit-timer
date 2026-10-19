"use client";

import { IconList, IconPlus } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";

const base = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] hover:bg-white/10 hover:text-white";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/** Sidebar links: the form at the top of the page, and the saved workouts section below it. */
export function CoachNav() {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const savedActive = hash === "#saved";

  const goSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById("saved");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    // With few workouts the page may not scroll at all, so also flash the section to show where it is.
    section?.classList.remove("flash");
    void section?.offsetWidth;
    section?.classList.add("flash");
    window.history.replaceState(null, "", "#saved");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const goTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <nav className="hidden flex-col gap-1 md:flex" aria-label="Coach">
      <a
        href="/coach"
        onClick={goTop}
        aria-current={savedActive ? undefined : "page"}
        className={`${base} ${savedActive ? "text-white/70" : "bg-white/10 text-white"}`}
      >
        <IconPlus size={18} aria-hidden="true" />
        New workout
      </a>
      <a
        href="/coach#saved"
        onClick={goSaved}
        aria-current={savedActive ? "location" : undefined}
        className={`${base} ${savedActive ? "bg-white/10 text-white" : "text-white/70"}`}
      >
        <IconList size={18} aria-hidden="true" />
        Saved workouts
      </a>
    </nav>
  );
}
