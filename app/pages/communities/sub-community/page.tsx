import type { Metadata } from "next"
import PageClient from "./page-client"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
    title: "Bloom - Sub-Community",
    description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    alternates: { canonical: "https://www.trybloom.org/pages/communities/sub-community/" },
    openGraph: {
        title: "Bloom - Sub-Community",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        url: "https://www.trybloom.org/pages/communities/sub-community/",
    },
    twitter: {
        title: "Bloom - Sub-Community",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
}


async function getInitialSubcommunity(subcommunityId: string | undefined) {
    if (!subcommunityId) return null
    const supabase = await createClient()
    const { data } = await supabase
        .from("sub_communities")
        .select("title, description")
        .eq("id", subcommunityId)
        .single()
    return data ?? null
}

export default async function Page({
    searchParams,
}: { searchParams: Promise<{ subcommunityID?: string }> }) {
    const { subcommunityID } = await searchParams
    const initialSubcommunity = await getInitialSubcommunity(subcommunityID)
    return <PageClient initialSubcommunity={initialSubcommunity} />
}
