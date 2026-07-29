import { type FormEvent, type ReactNode, useState } from "react"
import { Link } from "react-router-dom"
import SupporterBadge from "../SupporterBadge"

export type PostKind = "post" | "activity" | "event"

export interface PostData {
    id: string
    type?: PostKind
    title?: string | null
    body?: string | null
    location?: string | null
    imageUrls?: string[]
    createdAt?: string | null
    communityName?: string | null
    likeCount?: number
    likedByViewer?: boolean
    replyCount?: number
    author?: {
        id?: string | null
        name: string
        avatarUrl?: string | null
        supporter?: boolean
    } | null
}

export interface PostReplyData {
    id: string
    body: string
    createdAt: string
    author: {
        id?: string | null
        name: string
        avatarUrl?: string | null
        supporter?: boolean
    }
}

interface PostProps {
    post: PostData
    canManage?: boolean
    manageHref?: string
    onReport?: (post: PostData) => void | Promise<void>
    onToggleLike?: (post: PostData, currentlyLiked: boolean) => Promise<{ count: number; liked: boolean }>
    onLoadReplies?: (post: PostData) => Promise<PostReplyData[]>
    onCreateReply?: (post: PostData, body: string) => Promise<PostReplyData>
}

interface PostSurfaceProps {
    children: ReactNode
    className?: string
    id?: string
}

const postKinds: Record<PostKind, { icon: string; label: string }> = {
    post: { icon: "📝", label: "Post" },
    activity: { icon: "⚡", label: "Activity" },
    event: { icon: "📅", label: "Event" },
}

export function PostSurface({ children, className = "", id }: PostSurfaceProps) {
    return <article className={`post ${className}`.trim()} id={id}>{children}</article>
}

export default function Post({ post, canManage = false, manageHref, onReport, onToggleLike, onLoadReplies, onCreateReply }: PostProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [liked, setLiked] = useState(post.likedByViewer === true)
    const [likeCount, setLikeCount] = useState(post.likeCount ?? 0)
    const [replyCount, setReplyCount] = useState(post.replyCount ?? 0)
    const [repliesOpen, setRepliesOpen] = useState(false)
    const [replies, setReplies] = useState<PostReplyData[]>([])
    const [replyBody, setReplyBody] = useState("")
    const [engagementBusy, setEngagementBusy] = useState(false)
    const [repliesLoaded, setRepliesLoaded] = useState(false)
    const kind = postKinds[post.type ?? "post"] ?? postKinds.post
    const images = [...new Set(post.imageUrls ?? [])].slice(0, 5)
    const actionLabel = canManage ? "Manage" : "Report"

    async function handleAction() {
        setMenuOpen(false)
        if (!canManage) await onReport?.(post)
    }

    async function toggleLike() {
        if (!onToggleLike || engagementBusy) return
        setEngagementBusy(true)
        try {
            const result = await onToggleLike(post, liked)
            setLiked(result.liked)
            setLikeCount(result.count)
        } catch {
            // The data layer presents the user-facing error.
        } finally {
            setEngagementBusy(false)
        }
    }

    async function toggleReplies() {
        const opening = !repliesOpen
        setRepliesOpen(opening)
        if (!opening || repliesLoaded || !onLoadReplies) return
        setEngagementBusy(true)
        try {
            const loadedReplies = await onLoadReplies(post)
            setReplies(loadedReplies)
            setReplyCount(loadedReplies.length)
            setRepliesLoaded(true)
        } catch {
            setRepliesOpen(false)
        } finally {
            setEngagementBusy(false)
        }
    }

    async function submitReply(event: FormEvent) {
        event.preventDefault()
        const body = replyBody.trim()
        if (!body || !onCreateReply || engagementBusy) return
        setEngagementBusy(true)
        try {
            const reply = await onCreateReply(post, body)
            setReplies((current) => [...current, reply])
            setReplyCount((count) => count + 1)
            setReplyBody("")
            setRepliesLoaded(true)
        } catch {
            // Keep the reply text so the user can retry.
        } finally {
            setEngagementBusy(false)
        }
    }

    return (
        <PostSurface>
            <div className={`post-type-badge post-type-badge--${post.type ?? "post"}`}>
                <span className="post-type-icon" aria-hidden="true">{kind.icon}</span>
                <span>{kind.label}</span>
            </div>

            <button
                type="button"
                className="post-options-button"
                aria-label="Post options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
            >⋮</button>
            {menuOpen && (
                <div className="post-options-menu" role="menu">
                    {canManage && manageHref
                        ? <Link role="menuitem" to={manageHref}>{actionLabel}</Link>
                        : <button type="button" role="menuitem" onClick={handleAction}>{actionLabel}</button>}
                </div>
            )}

            {(post.author || post.communityName) && (
                <header className="post-author-header">
                    {post.author && (
                        <Link className="post-author-link" to={post.author.id ? `/profile?uid=${encodeURIComponent(post.author.id)}` : "#"}>
                            <span className="pfp-frame post-author-avatar">
                                {post.author.avatarUrl && <img src={post.author.avatarUrl} alt="Post author profile picture" loading="lazy" />}
                            </span>
                            <strong className="post-author-name">{post.author.name}</strong>
                            {post.author.supporter && <SupporterBadge />}
                        </Link>
                    )}
                    {post.communityName && <span className="post-community-name">in {post.communityName}</span>}
                </header>
            )}

            {post.title && <h3 className="post-title">{post.title}</h3>}
            {post.body && <p className="post-body">{post.body}</p>}
            {post.type === "event" && post.location && <p className="post-location"><span aria-hidden="true">📍</span><strong>Location:</strong> {post.location}</p>}

            {images.length > 0 && (
                <div className={`post-image-gallery post-image-gallery--${images.length}`}>
                    {images.map((url, index) => <img className="post-image" src={url} alt={post.title ? `Image ${index + 1} for ${post.title}` : `Post image ${index + 1}`} loading="lazy" key={url} />)}
                </div>
            )}

            {post.createdAt && <time className="post-time" dateTime={post.createdAt}>Posted on: {new Date(post.createdAt).toLocaleString()}</time>}

            <div className="post-engagement" aria-label="Post engagement">
                <button type="button" className={liked ? "is-liked" : ""} aria-pressed={liked} disabled={engagementBusy} onClick={toggleLike}>
                    <i className={liked ? "ri-heart-fill" : "ri-heart-line"} aria-hidden="true"></i>
                    <span>{likeCount}</span>
                    <span className="post-engagement-label">{likeCount === 1 ? "Like" : "Likes"}</span>
                </button>
                <button type="button" aria-expanded={repliesOpen} disabled={engagementBusy} onClick={toggleReplies}>
                    <i className="ri-chat-3-line" aria-hidden="true"></i>
                    <span>{replyCount}</span>
                    <span className="post-engagement-label">{replyCount === 1 ? "Reply" : "Replies"}</span>
                </button>
            </div>

            {repliesOpen && (
                <section className="post-replies" aria-label="Replies">
                    <div className="post-reply-list" aria-live="polite">
                        {replies.length ? replies.map((reply) => (
                            <article className="post-reply" key={reply.id}>
                                <Link className="post-reply-author" to={reply.author.id ? `/profile?uid=${encodeURIComponent(reply.author.id)}` : "#"}>
                                    <strong>{reply.author.name}</strong>
                                    {reply.author.supporter && <SupporterBadge />}
                                </Link>
                                <p>{reply.body}</p>
                                <time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleString()}</time>
                            </article>
                        )) : <p className="post-empty-message">No replies yet.</p>}
                    </div>
                    <form className="post-reply-form" onSubmit={submitReply}>
                        <textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} maxLength={2000} placeholder="Write a reply" aria-label="Write a reply"></textarea>
                        <button type="submit" disabled={engagementBusy || !replyBody.trim()}>Reply</button>
                    </form>
                </section>
            )}
        </PostSurface>
    )
}

export function PostList({ posts, ...postProps }: { posts: PostData[] } & Omit<PostProps, "post">) {
    return <>{posts.map((post) => <Post key={post.id} post={post} {...postProps} />)}</>
}
