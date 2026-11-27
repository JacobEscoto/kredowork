import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/about", siteUrl).toString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: new URL("/bounties", siteUrl).toString(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
