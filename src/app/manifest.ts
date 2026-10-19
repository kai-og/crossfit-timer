import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable identity, so an installed app keeps its identity if start_url ever changes.
    id: "/",
    name: "CrossFit Timer",
    short_name: "WOD Timer",
    description: "Full-screen workout timer for the box. Works offline once opened.",
    start_url: "/t",
    scope: "/",
    display: "standalone",
    // Prefer true full screen (no status bar) for a phone mounted on the rig, and fall back to standalone.
    display_override: ["fullscreen", "standalone"],
    // When the installed app is already open and another timer link is opened, reuse that window.
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
    background_color: "#101114",
    theme_color: "#101114",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Not in Next's types yet: asks browsers that support it to open in-scope links in the installed app.
    ...({ handle_links: "preferred" } as object),
  };
}
