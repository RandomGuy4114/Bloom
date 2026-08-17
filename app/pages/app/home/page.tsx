import type { Metadata } from "next"
import PageClient from "./page-client"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
    title: "Bloom - Dashboard",
    description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    alternates: { canonical: "https://www.trybloom.org/pages/app/home/" },
    openGraph: {
        title: "Bloom - Dashboard",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
        url: "https://www.trybloom.org/pages/app/home/",
    },
    twitter: {
        title: "Bloom - Dashboard",
        description: "Bloom helps you discover local communities, events, and businesses near you, and makes it easy to connect with the people around you.",
    },
}

interface InitialData {
    id: string | null
    display_name: string | null
    Language: string | null
    warning: string | null
    joined_communities: string[] | null
}

interface InitialComms {
    id: string | null
    name: string | null
    description: string | null
    private: boolean | null
    members: string[] | null
    latitude: number | null
    longitude: number | null
    radius_meters: number | null
}

async function getUserId(supabase: any): Promise<string | null> {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
}


async function getJoinedComms(userId: string | null, supabase: any): Promise<InitialComms[] | null> {
    if (!userId) return null
    const { data } = await supabase
        .from("Communities")
        .select("id, name, description, private, members, latitude, longitude, radius_meters")
        .contains("members", [userId])
    return data ?? null
}

async function getInitialData(userId: string | null, supabase: any): Promise<InitialData | null> {
    if (!userId) return null
    const { data } = await supabase
        .from("profiles")
        .select("id, display_name, Language, warning, joined_communities")
        .eq("id", userId)
        .single()
    return data ?? null
}

export default async function Page({ }) {
    const supabase = await createClient()
    const userID = await getUserId(supabase)
    const initialData = await getInitialData(userID, supabase)
    const initialComms = await getJoinedComms(userID, supabase)

    return <PageClient initialData={initialData} initialComms={initialComms} />
}