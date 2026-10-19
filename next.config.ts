import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the running app know which version it is (see UpdateWatcher). Vercel sets the commit; locally it is "dev".
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // The saved workouts tab became a section of the coach page.
    return [{ source: "/coach/saved", destination: "/coach#saved", permanent: false }];
  },
  async headers() {
    return [
      {
        // The service worker script must never be served from a stale HTTP cache.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
