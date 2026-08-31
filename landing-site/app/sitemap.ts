import { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { blogPosts } from "@/lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "telecharger", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "fonctionnalites", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "tarifs", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "a-propos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "blog", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "aide", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "contact", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "inscription", priority: 0.6, changeFrequency: "yearly" as const },
    { path: "connexion", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "conditions", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "confidentialite", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "remboursement", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "mentions-legales", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${siteUrl}/${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}