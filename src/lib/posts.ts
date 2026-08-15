import { supabase } from "@/lib/supabase/client"
import type { FeedPost } from "@/components/posts/PostFeed"
import type { PostReplyData } from "@/components/posts/Post"

const SUPABASE_ORIGIN = "https://auilmosognuitlpoqchn.supabase.co"

export function isTrustedImageUrl(value: string | null | undefined, bucketName: string, allowBlob = false) {
    if (!value || !bucketName) return false
    try {
        const url = new URL(value, typeof window !== "undefined" ? window.location.href : SUPABASE_ORIGIN)
        if (allowBlob && url.protocol === "blob:") return true
        const bucketPath = `/storage/v1/object/public/${encodeURIComponent(bucketName)}/`
        return url.protocol === "https:" && url.origin === SUPABASE_ORIGIN && url.pathname.startsWith(bucketPath)
    } catch {
        return false
    }
}

export function getPostImageUrls(imgLinks: string[] | null | undefined, imgLink: string | null | undefined) {
    const candidates = Array.isArray(imgLinks) ? [...imgLinks] : []
    if (imgLink) candidates.unshift(imgLink)
    return [...new Set(candidates)].filter((url) => isTrustedImageUrl(url, "Post Images"))
}

export function formatEventLocation(location: unknown): string {
    if (typeof location === "string") return location.trim()
    if (Array.isArray(location) && location.length >= 2) return `${location[0]}, ${location[1]}`
    if (location && typeof location === "object") {
        const loc = location as Record<string, unknown>
        if (loc.name || loc.address) return String(loc.name || loc.address).trim()
        const latitude = loc.latitude ?? loc.lat
        const longitude = loc.longitude ?? loc.lng ?? loc.lon
        if (latitude !== undefined && longitude !== undefined) return `${latitude}, ${longitude}`
    }
    return ""
}

export function isPostOwner(post: { user_id?: string | null; author?: string | null }, userId: string | null | undefined) {
    return Boolean(userId) && (post?.user_id === userId || post?.author === userId)
}

interface Profile {
    display_name?: string | null
    username?: string | null
    avatar_url?: string | null
    supporter?: boolean | null
}

const profileCache = new Map<string, Promise<Profile | null>>()

export function getUserProfile(userId: string | null | undefined): Promise<Profile | null> {
    if (!userId) return Promise.resolve(null)
    if (!profileCache.has(userId)) {
        const request = Promise.resolve(
            supabase
                .rpc("get_public_profile", { target_user: userId })
                .maybeSingle(),
        ).then(({ data, error }) => {
            if (error) {
                profileCache.delete(userId)
                console.error("Error fetching user profile:", error.message)
                return null
            }
            return data as Profile | null
        })
        profileCache.set(userId, request)
    }
    return profileCache.get(userId)!
}

const communityNameCache = new Map<string, Promise<string | null>>()

export function getCommunityNameFromID(communityId: string | null | undefined): Promise<string | null> {
    if (!communityId) return Promise.resolve(null)
    if (!communityNameCache.has(communityId)) {
        const request = Promise.resolve(
            supabase
                .from("Communities")
                .select("name")
                .eq("id", communityId)
                .single(),
        ).then(({ data, error }) => {
            if (error) {
                communityNameCache.delete(communityId)
                console.error("Error fetching community name:", error.message)
                return null
            }
            return data?.name ?? null
        })
        communityNameCache.set(communityId, request)
    }
    return communityNameCache.get(communityId)!
}

export function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null)
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => resolve({ latitude, longitude }),
            (error) => {
                console.error("Error getting location:", error.message)
                resolve(null)
            },
            { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
        )
    })
}

interface RawPost {
    id: string
    post_type?: string
    title?: string | null
    body?: string | null
    location?: unknown
    img_link?: string | null
    img_links?: string[] | null
    created_at?: string | null
    user_id?: string | null
    author?: string | null
    community?: string | null
}

async function loadPostEngagement(postIds: string[], viewerId: string | null | undefined) {
    const likeCounts = new Map<string, number>()
    const replyCounts = new Map<string, number>()
    const viewerLikes = new Set<string>()
    if (!postIds.length) return { likeCounts, replyCounts, viewerLikes }

    const [{ data: likes, error: likesError }, { data: replies, error: repliesError }] = await Promise.all([
        supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
        supabase.from("post_replies").select("post_id").in("post_id", postIds),
    ])

    if (likesError) console.error("Unable to load post likes:", likesError.message)
    if (repliesError) console.error("Unable to load post replies:", repliesError.message)

    for (const like of likes ?? []) {
        likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1)
        if (like.user_id === viewerId) viewerLikes.add(like.post_id)
    }
    for (const reply of replies ?? []) {
        replyCounts.set(reply.post_id, (replyCounts.get(reply.post_id) ?? 0) + 1)
    }
    return { likeCounts, replyCounts, viewerLikes }
}

async function toFeedPosts(posts: RawPost[], viewerId: string | null | undefined): Promise<FeedPost[]> {
    if (!posts.length) return []

    const [postDetails, engagement] = await Promise.all([
        Promise.all(posts.map(async (post) => {
            const authorId = post.user_id ?? post.author ?? null
            const [communityName, authorProfile] = await Promise.all([
                getCommunityNameFromID(post.community),
                getUserProfile(authorId),
            ])
            return { authorId, communityName, authorProfile }
        })),
        loadPostEngagement(posts.map((post) => post.id), viewerId),
    ])

    return posts.map((post, index) => {
        const { authorId, communityName, authorProfile } = postDetails[index]
        const type = post.post_type === "activity" || post.post_type === "event" ? post.post_type : "post"
        return {
            id: String(post.id),
            type,
            title: post.title,
            body: post.body,
            location: formatEventLocation(post.location),
            imageUrls: getPostImageUrls(post.img_links, post.img_link),
            createdAt: post.created_at,
            author: {
                id: authorId,
                name: authorProfile?.display_name || authorProfile?.username || "",
                avatarUrl: isTrustedImageUrl(authorProfile?.avatar_url, "Profile Pictures", true) ? authorProfile?.avatar_url : null,
                supporter: authorProfile?.supporter === true,
            },
            communityName: communityName || "",
            likeCount: engagement.likeCounts.get(post.id) ?? 0,
            likedByViewer: engagement.viewerLikes.has(post.id),
            replyCount: engagement.replyCounts.get(post.id) ?? 0,
            canManage: isPostOwner(post, viewerId),
            manageHref: isPostOwner(post, viewerId) ? `/post?postId=${post.id}` : undefined,
        }
    })
}

export async function loadHomeFeed(viewerId: string | null | undefined): Promise<{ posts: FeedPost[]; emptyMessage?: string }> {
    const location = await getUserLocation()
    const { data: posts, error } = await supabase.rpc("get_home_feed", {
        user_latitude: location?.latitude ?? null,
        user_longitude: location?.longitude ?? null,
        feed_limit: 100,
    })

    if (error) {
        console.error("Error fetching posts from joined communities:", error.message)
        return { posts: [], emptyMessage: "Unable to load your feed right now." }
    }

    const feedPosts = await toFeedPosts((posts ?? []) as RawPost[], viewerId)
    return { posts: feedPosts, emptyMessage: "No posts yet. Join a community or write the first update." }
}

export async function togglePostLike(postId: string, currentlyLiked: boolean, viewerId: string) {
    const query = supabase.from("post_likes")
    const { error } = currentlyLiked
        ? await query.delete().eq("post_id", postId).eq("user_id", viewerId)
        : await query.insert({ post_id: postId, user_id: viewerId })

    if (error && error.code !== "23505") throw error
    const liked = error?.code === "23505" ? true : !currentlyLiked

    const { count, error: countError } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
    if (countError) throw countError

    return { liked, count: count ?? 0 }
}

export async function loadPostReplies(postId: string): Promise<PostReplyData[]> {
    const { data, error } = await supabase
        .from("post_replies")
        .select("id, user_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
    if (error) throw error

    const authorIds = [...new Set((data ?? []).map((reply) => reply.user_id))]
    const profiles = new Map(await Promise.all(authorIds.map(async (id) => [id, await getUserProfile(id)] as const)))

    return (data ?? []).map((reply) => {
        const profile = profiles.get(reply.user_id)
        return {
            id: reply.id,
            body: reply.body,
            createdAt: reply.created_at,
            author: {
                id: reply.user_id,
                name: profile?.display_name || profile?.username || "Bloom user",
                avatarUrl: isTrustedImageUrl(profile?.avatar_url, "Profile Pictures", true) ? profile?.avatar_url : null,
                supporter: profile?.supporter === true,
            },
        }
    })
}

export async function createPostReply(postId: string, body: string, viewerId: string): Promise<PostReplyData> {
    const normalizedBody = String(body ?? "").trim()
    if (!normalizedBody || normalizedBody.length > 2000) {
        throw new Error("Replies must be between 1 and 2,000 characters.")
    }

    const { data, error } = await supabase
        .from("post_replies")
        .insert({ post_id: postId, user_id: viewerId, body: normalizedBody })
        .select("id, user_id, body, created_at")
        .single()
    if (error) throw error

    const profile = await getUserProfile(viewerId)
    return {
        id: data.id,
        body: data.body,
        createdAt: data.created_at,
        author: {
            id: viewerId,
            name: profile?.display_name || profile?.username || "Bloom user",
            avatarUrl: isTrustedImageUrl(profile?.avatar_url, "Profile Pictures", true) ? profile?.avatar_url : null,
            supporter: profile?.supporter === true,
        },
    }
}

export async function reportPost(postId: string) {
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to report this post?")) {
        return
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        window.alert("You must be logged in to report a post.")
        return
    }

    const { data: post, error: postError } = await supabase
        .rpc("get_visible_posts", { post_id: postId })
        .single()
    if (postError) {
        console.error("Error loading post for report:", postError.message)
        window.alert("Unable to report this post. Please try again.")
        return
    }
    if (isPostOwner(post as RawPost, user.id)) {
        window.alert("You cannot report your own post.")
        return
    }

    const { error } = await supabase.from("PostReports").insert([{ post_id: postId, reporter_id: user.id }])

    if (error?.code === "23505") {
        window.alert("You have already reported this post.")
        return
    }
    if (error) {
        console.error("Error reporting post:", error.message)
        window.alert("Unable to report this post. Please try again.")
        return
    }

    window.alert("Post reported successfully.")
}
