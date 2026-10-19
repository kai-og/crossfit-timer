import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { TimerLoader } from "@/components/TimerLoader";
import { TimerSkeleton } from "@/components/TimerSkeleton";

export const metadata: Metadata = { title: "Timer" };
export const viewport: Viewport = { themeColor: "#101114", viewportFit: "cover" };

export default function TimerPage() {
  return (
    <Suspense fallback={<TimerSkeleton />}>
      <TimerLoader />
    </Suspense>
  );
}
