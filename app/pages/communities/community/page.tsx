import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import PageClient from "./page-client"

export const metadata: Metadata = {
    title: "Bloom - Community",
    description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    alternates: { canonical: "https://www.trybloom.org/pages/communities/community/" },
    openGraph: {
        title: "Bloom - Community",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        url: "https://www.trybloom.org/pages/communities/community/",
    },
    twitter: {
        title: "Bloom - Community",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
}

interface InitialCommunity {
    name: string | null
    description: string | null
}

async function getInitialCommunity(communityId: string | undefined): Promise<InitialCommunity | null> {
    if (!communityId) return null

    const supabase = await createClient()
    const { data } = await supabase
        .from("Communities")
        .select("name, description")
        .eq("id", communityId)
        .single()

    return data ?? null
}

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ communityID?: string }>
}) {
    const { communityID } = await searchParams
    const initialCommunity = await getInitialCommunity(communityID)

    return <PageClient initialCommunity={initialCommunity} />
}
