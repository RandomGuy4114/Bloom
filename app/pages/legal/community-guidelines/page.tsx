import type { Metadata } from "next"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: "Community Guidelines",
    description: "Read The Bloom Project's community guidelines.",
    alternates: { canonical: "https://www.trybloom.org/pages/legal/community-guidelines/" },
    openGraph: {
        title: "Community Guidelines",
        description: "Read The Bloom Project's community guidelines.",
        url: "https://www.trybloom.org/pages/legal/community-guidelines/",
    },
    twitter: {
        title: "Community Guidelines",
        description: "Read The Bloom Project's community guidelines.",
    },
}

export default function Page() {
    return <PageClient />
}
