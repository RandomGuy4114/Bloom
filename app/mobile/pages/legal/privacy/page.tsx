import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: "Bloom - Privacy Policy",
    description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    alternates: { canonical: "https://www.trybloom.org/mobile/pages/legal/privacy/" },
    openGraph: {
        title: "Bloom - Privacy Policy",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        url: "https://www.trybloom.org/mobile/pages/legal/privacy/",
    },
    twitter: {
        title: "Bloom - Privacy Policy",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
}

export default function Page() {
    return <PageClient />
}
