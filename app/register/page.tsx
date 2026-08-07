import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: "Register",
    description: "Create a Bloom account to start connecting with local communities, events, and businesses near you.",
    alternates: { canonical: "https://www.trybloom.org/register/" },
    openGraph: {
        title: "Register",
        description: "Create a Bloom account to start connecting with local communities, events, and businesses near you.",
        url: "https://www.trybloom.org/register/",
    },
    twitter: {
        title: "Register",
        description: "Create a Bloom account to start connecting with local communities, events, and businesses near you.",
    },
}

export default function Page() {
    return <PageClient />
}
