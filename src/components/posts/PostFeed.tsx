import { useLayoutEffect, useRef, useState } from "react"
import Post, { type PostData, type PostReplyData } from "./Post"

export interface FeedPost extends PostData {
    canManage?: boolean
    manageHref?: string
}

interface PostFeedState {
    emptyMessage?: string
    posts: FeedPost[]
}

interface PostFeedProps {
    emptyMessage?: string
    id?: string
}

export default function PostFeed({ emptyMessage = "No posts available.", id = "feed" }: PostFeedProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const [state, setState] = useState<PostFeedState>({ posts: [], emptyMessage })

    useLayoutEffect(() => {
        const host = hostRef.current
        if (!host) return

        const handlePosts = (event: Event) => {
            const detail = (event as CustomEvent<PostFeedState>).detail
            setState({
                posts: Array.isArray(detail?.posts) ? detail.posts : [],
                emptyMessage: detail?.emptyMessage || emptyMessage,
            })
        }

        host.addEventListener("bloom:render-posts", handlePosts)
        return () => host.removeEventListener("bloom:render-posts", handlePosts)
    }, [emptyMessage])

    const report = (post: PostData) => {
        hostRef.current?.dispatchEvent(new CustomEvent("bloom:report-post", {
            bubbles: true,
            detail: { postId: post.id },
        }))
    }

    function request<T>(name: string, detail: Record<string, unknown>) {
        return new Promise<T>((resolve, reject) => {
            hostRef.current?.dispatchEvent(new CustomEvent(name, {
                bubbles: true,
                detail: { ...detail, resolve, reject },
            }))
        })
    }

    return (
        <div id={id} ref={hostRef}>
            {state.posts.length
                ? state.posts.map((post) => (
                    <Post
                        key={post.id}
                        post={post}
                        canManage={post.canManage}
                        manageHref={post.manageHref}
                        onReport={report}
                        onToggleLike={(selectedPost, currentlyLiked) => request<{ count: number; liked: boolean }>("bloom:toggle-post-like", { postId: selectedPost.id, currentlyLiked })}
                        onLoadReplies={(selectedPost) => request<PostReplyData[]>("bloom:load-post-replies", { postId: selectedPost.id })}
                        onCreateReply={(selectedPost, body) => request<PostReplyData>("bloom:create-post-reply", { postId: selectedPost.id, body })}
                    />
                ))
                : <div className="post"><p className="post-empty-message">{state.emptyMessage}</p></div>}
        </div>
    )
}
