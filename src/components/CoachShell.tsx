import { IconClockBolt, IconList, IconLogout, IconPlus, IconUser } from "@tabler/icons-react";
import { signOut } from "@/auth";

const navItem =
  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[15px] text-white/70 hover:bg-white/10 hover:text-white";

/** Frame for the signed-in coach pages: dark sidebar on desktop, a slim top bar on small screens. */
export function CoachShell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <aside className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white md:sticky md:top-0 md:h-dvh md:w-[188px] md:flex-none md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-3 md:py-4">
        <div className="flex items-center gap-2.5 md:mb-5 md:px-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-lime text-ink">
            <IconClockBolt size={18} aria-hidden="true" />
          </span>
          <span className="font-display text-xl leading-none">WOD Timer</span>
        </div>

        <nav className="hidden flex-col gap-1 md:flex" aria-label="Coach">
          <a href="/coach" aria-current="page" className={`${navItem} bg-white/10 text-white`}>
            <IconPlus size={18} aria-hidden="true" />
            New workout
          </a>
          <a href="#saved" className={navItem}>
            <IconList size={18} aria-hidden="true" />
            Saved workouts
          </a>
        </nav>

        <div className="flex items-center gap-3 text-sm md:mt-auto md:flex-col md:items-stretch md:gap-1">
          <div className="flex items-center gap-2 md:px-1 md:pb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime text-xs font-medium text-ink">
              {name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[110px] truncate md:max-w-none">{name}</span>
          </div>
          <a href="/welcome" className={`${navItem} hidden md:flex`}>
            <IconUser size={18} aria-hidden="true" />
            Change name
          </a>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className={`${navItem} w-full`}>
              <IconLogout size={18} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-5 md:px-8">{children}</main>
    </div>
  );
}
