import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: "Login",
    description: "Log in to Bloom to connect with local communities, events, and businesses near you.",
    alternates: { canonical: "https://www.trybloom.org/login/" },
    openGraph: {
        title: "Login",
        description: "Log in to Bloom to connect with local communities, events, and businesses near you.",
        url: "https://www.trybloom.org/login/",
    },
    twitter: {
        title: "Login",
        description: "Log in to Bloom to connect with local communities, events, and businesses near you.",
    },
}

export default function Page() {
    return <PageClient />
}
