"use client";

import { IconList, IconPlus } from "@tabler/icons-react";
import { usePathname } from "next/navigation";

const base = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] hover:bg-white/10 hover:text-white";

/** Sidebar links; the current page is highlighted. */
export function CoachNav() {
  const pathname = usePathname();
  const items = [
    { href: "/coach", label: "New workout", Icon: IconPlus, current: pathname === "/coach" },
    { href: "/coach/saved", label: "Saved workouts", Icon: IconList, current: pathname.startsWith("/coach/saved") },
  ];
  return (
    <nav className="hidden flex-col gap-1 md:flex" aria-label="Coach">
      {items.map(({ href, label, Icon, current }) => (
        <a
          key={href}
          href={href}
          aria-current={current ? "page" : undefined}
          className={`${base} ${current ? "bg-white/10 text-white" : "text-white/70"}`}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </a>
      ))}
    </nav>
  );
}
