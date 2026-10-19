import { IconClockBolt } from "@tabler/icons-react";

/** Centered card used by the sign-in and welcome pages. */
export function AuthCard({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-lime">
            <IconClockBolt size={20} aria-hidden="true" />
          </span>
          <span className="font-display text-2xl leading-none">WOD Timer</span>
        </div>
        <h1 className="font-display text-4xl leading-none">{title}</h1>
        <p className="mt-2 mb-5 text-muted">{intro}</p>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </main>
  );
}
