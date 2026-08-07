import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: "Bloom - Business Dashboard",
    description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    alternates: { canonical: "https://www.trybloom.org/mobile/pages/business/dashboard/" },
    openGraph: {
        title: "Bloom - Business Dashboard",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        url: "https://www.trybloom.org/mobile/pages/business/dashboard/",
    },
    twitter: {
        title: "Bloom - Business Dashboard",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
}

export default function Page() {
    return <PageClient />
}
