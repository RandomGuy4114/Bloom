import type { Metadata } from "next"
import "@/App.css"
import ScrollToTop from "@/components/ScrollToTop"
import RouteTransition from "@/components/RouteTransition"

const siteUrl = "https://www.trybloom.org"
const title = "The Bloom Project™ — Making local connections easier"
const description = "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you."

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: title,
        template: "%s | Bloom",
    },
    description,
    icons: {
        icon: "/Assets/BloomLogo.png",
    },
    openGraph: {
        type: "website",
        siteName: "The Bloom Project",
        title,
        description,
        url: siteUrl,
        images: ["/Assets/BloomLogo.png"],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/Assets/BloomLogo.png"],
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <ScrollToTop />
                <RouteTransition />
                {children}
            </body>
        </html>
    )
}
