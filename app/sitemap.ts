import type { MetadataRoute } from "next";
import { absoluteUrl, useCasePages } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "/",
    "/create",
    "/pricing",
    ...useCasePages.map((page) => page.path),
  ];

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/create" ? 0.9 : 0.75,
  }));
}
