"use client";

import { IconList, IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";

const base = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] hover:bg-white/10 hover:text-white";

type Section = "new" | "saved";

/** Which part of the page the reader is on: the saved workouts once their section reaches the upper part of the screen. */
function currentSection(): Section {
  const saved = document.getElementById("saved");
  if (!saved) return "new";
  const root = document.documentElement;
  const scrollable = root.scrollHeight > window.innerHeight + 2;
  if (!scrollable) return "new";
  const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2;
  return saved.getBoundingClientRect().top <= window.innerHeight * 0.4 || atBottom ? "saved" : "new";
}

/** Sidebar links: the form at the top of the page, and the saved workouts section below it. Follows the scroll. */
export function CoachNav() {
  const [active, setActive] = useState<Section>("new");

  useEffect(() => {
    const update = () => setActive(currentSection());
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const goSaved = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById("saved");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    // With few workouts the page may not scroll at all, so also flash the section to show where it is.
    section?.classList.remove("flash");
    void section?.offsetWidth;
    section?.classList.add("flash");
    // Set right away: when the page cannot scroll there is no scroll event to follow.
    setActive("saved");
  };

  const goTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActive("new");
  };

  const item = (on: boolean) => `${base} ${on ? "bg-white/10 text-white" : "text-white/70"}`;

  return (
    <nav className="hidden flex-col gap-1 md:flex" aria-label="Coach">
      <a href="/coach" onClick={goTop} aria-current={active === "new" ? "page" : undefined} className={item(active === "new")}>
        <IconPlus size={18} aria-hidden="true" />
        New workout
      </a>
      <a
        href="/coach#saved"
        onClick={goSaved}
        aria-current={active === "saved" ? "location" : undefined}
        className={item(active === "saved")}
      >
        <IconList size={18} aria-hidden="true" />
        Saved workouts
      </a>
    </nav>
  );
}
