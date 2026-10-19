import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { TimerLoader } from "@/components/TimerLoader";

export const metadata: Metadata = { title: "Timer" };
export const viewport: Viewport = { themeColor: "#09090b", viewportFit: "cover" };

export default function TimerPage() {
  return (
    <Suspense fallback={<main className="fixed inset-0 bg-zinc-950" />}>
      <TimerLoader />
    </Suspense>
  );
}
