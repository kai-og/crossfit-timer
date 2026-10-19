import type { Metadata } from "next";
import { CoachForm } from "@/components/CoachForm";

export const metadata: Metadata = { title: "Coach · Set up a workout" };

export default function CoachPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:py-12">
      <h1 className="mb-1 text-3xl font-bold">Set up a workout</h1>
      <p className="mb-8 text-zinc-500">Configure it here, then open the link on the phone next to the rig.</p>
      <CoachForm />
    </main>
  );
}
