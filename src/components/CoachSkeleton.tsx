/** Placeholder with the coach page's shape (dark sidebar, form cards) while the signed-in page loads. */
export function CoachSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row" aria-busy="true" aria-label="Loading">
      <aside className="flex items-center justify-between bg-ink px-4 py-3 md:sticky md:top-0 md:h-dvh md:w-[188px] md:flex-none md:flex-col md:items-stretch md:justify-start md:gap-3 md:px-3 md:py-4">
        <div className="h-7 w-32 animate-pulse rounded-md bg-white/15" />
        <div className="hidden h-9 w-full animate-pulse rounded-lg bg-white/10 md:block" />
        <div className="hidden h-9 w-full animate-pulse rounded-lg bg-white/10 md:block" />
      </aside>
      <main className="min-w-0 flex-1 px-5 py-5 md:px-8">
        <div className="h-9 w-72 animate-pulse rounded bg-black/10" />
        <div className="mt-2 mb-4 h-4 w-96 max-w-full animate-pulse rounded bg-black/5" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_256px]">
          <div className="flex flex-col gap-3">
            <div className="h-36 animate-pulse rounded-xl border border-line bg-white" />
            <div className="h-48 animate-pulse rounded-xl border border-line bg-white" />
            <div className="h-11 w-48 animate-pulse rounded-lg bg-black/10" />
          </div>
          <div className="aspect-square animate-pulse rounded-xl border border-line bg-white" />
        </div>
      </main>
    </div>
  );
}
