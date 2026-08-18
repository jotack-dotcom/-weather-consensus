import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.howhot.today",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://www.howhot.today/privacy",
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}