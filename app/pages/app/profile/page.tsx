import type { Metadata } from "next"
import PageClient from "./page-client"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
    title: "Bloom - Profile",
    description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    alternates: { canonical: "https://www.trybloom.org/pages/app/profile/" },
    openGraph: {
        title: "Bloom - Profile",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        url: "https://www.trybloom.org/pages/app/profile/",
    },
    twitter: {
        title: "Bloom - Profile",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
}

interface InitialData {
    id: string | null
    display_name: string | null
    username: string | null
    Language: string | null
    joined_communities: string[] | null
}

async function getInitialData(supabase: any): Promise<InitialData> {
    const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, Language, joined_communities")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single()

    return data ?? {
        id: null,
        display_name: null,
        username: null,
        Language: null,
        joined_communities: null
    }
}

export default async function Page() {
    const supabase = await createClient()
    const initialData = await getInitialData(supabase)

    return <PageClient initialData={initialData} />
}
