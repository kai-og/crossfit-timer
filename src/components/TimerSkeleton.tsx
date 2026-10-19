/** Placeholder with the timer's shape while a workout loads, so the screen never jumps from blank to content. */
export function TimerSkeleton() {
  return (
    <main
      className="fixed inset-x-0 top-0 flex h-dvh flex-col bg-night px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),0.75rem)]"
      aria-busy="true"
      aria-label="Loading workout"
    >
      <div className="h-1.5 rounded-full bg-white/15" />
      <div className="mt-6 h-4 w-24 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-8 w-48 animate-pulse rounded bg-white/10" />
      <div className="flex flex-1 items-center justify-center">
        <div className="h-[30vh] w-full animate-pulse rounded-3xl bg-white/[0.06]" />
      </div>
      <div className="h-[3.75rem] animate-pulse rounded-[14px] bg-white/10" />
      <div className="mt-3 h-14 rounded-[14px] border border-white/10" />
    </main>
  );
}
