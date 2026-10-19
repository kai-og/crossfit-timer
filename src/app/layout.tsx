import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import { UpdateWatcher } from "@/components/UpdateWatcher";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// The scoreboard face: used for clocks, workout names and big headings.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "WOD Timer",
  description: "Workout timer for the box: set it up on desktop, run it full screen on a phone.",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "WOD Timer", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <RegisterSW />
        <UpdateWatcher />
      </body>
    </html>
  );
}
