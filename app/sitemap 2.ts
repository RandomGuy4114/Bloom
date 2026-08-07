import type { MetadataRoute } from "next"

const siteUrl = "https://www.trybloom.org"

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1.0 },
        { url: `${siteUrl}/login/`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${siteUrl}/register/`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${siteUrl}/pages/legal/community-guidelines/`, changeFrequency: "yearly", priority: 0.3 },
    ]
}
