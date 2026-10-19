// The phone timer is dark from the very first paint. Without this the page itself stays light (the coach pages' paper
// colour) until JavaScript runs, and iPhone Safari shows that light colour in the strip below the full-screen timer.
export default function TimerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{"html,body{background:#101114;min-height:100dvh}"}</style>
      {children}
    </>
  );
}
