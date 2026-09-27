import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "#play14 - play is the way",
    short_name: "#play14",
    description:
      "#play14 is a worldwide gathering of like-minded people who believe that playing is the best way to learn, share and be creative!",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff5200",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
