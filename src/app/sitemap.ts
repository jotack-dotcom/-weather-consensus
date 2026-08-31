import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.howhot.today",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://www.howhot.today/weather/stockholm",
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://www.howhot.today/weather/gothenburg",
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://www.howhot.today/weather/malmo",
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://www.howhot.today/weather/uppsala",
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://www.howhot.today/weather/lulea",
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://www.howhot.today/privacy",
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}