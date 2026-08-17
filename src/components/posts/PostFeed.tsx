"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { createPostReply, loadHomeFeed, loadPostReplies, reportPost, togglePostLike } from "@/lib/posts"
import Post, { type PostData, type PostReplyData } from "./Post"
import { motion, type Variants } from "motion/react"

export interface FeedPost extends PostData {
    canManage?: boolean
    manageHref?: string
}

const feedVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.06 },
    },
}

const postVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
}

interface PostFeedProps {
    emptyMessage?: string
    id?: string
}

export default function PostFeed({ emptyMessage = "No posts available.", id = "feed" }: PostFeedProps) {
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [message, setMessage] = useState(emptyMessage)
    const [viewerId, setViewerId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (cancelled) return
            if (!user) {
                setPosts([])
                setMessage("Log in to see your feed.")
                setLoading(false)
                return
            }
            setViewerId(user.id)
            const result = await loadHomeFeed(user.id)
            if (cancelled) return
            setPosts(result.posts)
            if (result.emptyMessage) setMessage(result.emptyMessage)
            setLoading(false)
        }

        void load()
        return () => {
            cancelled = true
        }
    }, [])

    function report(post: PostData) {
        void reportPost(post.id)
    }

    async function handleToggleLike(post: PostData, currentlyLiked: boolean) {
        if (!viewerId) throw new Error("You must be logged in to like posts.")
        return togglePostLike(post.id, currentlyLiked, viewerId)
    }

    async function handleLoadReplies(post: PostData): Promise<PostReplyData[]> {
        return loadPostReplies(post.id)
    }

    async function handleCreateReply(post: PostData, body: string): Promise<PostReplyData> {
        if (!viewerId) throw new Error("You must be logged in to reply.")
        return createPostReply(post.id, body, viewerId)
    }

    return (
        <motion.div id={id} initial="hidden" animate="visible" variants={feedVariants}>
            {posts.length
                ? posts.map((post) => (
                    <motion.div key={post.id} variants={postVariants}>
                        <Post
                            post={post}
                            canManage={post.canManage}
                            manageHref={post.manageHref}
                            onReport={report}
                            onToggleLike={handleToggleLike}
                            onLoadReplies={handleLoadReplies}
                            onCreateReply={handleCreateReply}
                        />
                    </motion.div>
                ))
                : loading ? <motion.div className="loadingSkeletonPost">
                    <div className="loadingSkeleton" />
                    <div className="loadingSkeleton" style={{width: "50%"}}/>
                    <div className="loadingSkeleton" style={{width: "20%"}}/>
                    <div className="loadingSkeleton" style={{width: "80%", height: "300px"}}/>
                </motion.div> : <div className="post"><p className="post-empty-message">{message}</p></div>}
        </motion.div>
    )
}
