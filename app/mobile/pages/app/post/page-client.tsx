"use client"

import type { CSSProperties } from "react"
import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"
import { PostSurface } from "@/components/posts/Post"

export const pagePath = "/mobile/pages/app/post/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/post/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/post.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Post"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation mobile />
    <div className="main-layout">
        <div className="feed-container">
            <div className="post-container">
                <h1 style={{ "textAlign": "center" } as CSSProperties}>Manage Post</h1>
                <PostSurface id="post">
                    <h1 id="postTitle"></h1>
                    <p id="postContent"></p>
                </PostSurface>
                <PostSurface id="managePostTools">
                    <button id="editPostButton">Edit Post</button>
                    <button id="deletePostButton">Delete Post</button>
                </PostSurface>
            </div>
        </div>
    </div>

            </>
        </PageLifecycle>
    )
}
