import type { MetadataRoute } from "next";
import { LAND_BRAND, LAND_SHORT } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: LAND_BRAND,
    short_name: LAND_SHORT,
    description: LAND_BRAND,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#d4a017",
    lang: "th",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
