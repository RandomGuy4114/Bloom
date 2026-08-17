"use client"

import type { CSSProperties } from "react"
import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/communities/communities/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/pages/communities/communities/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/communities.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Communities"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation usernameLabel="Communities" />
    <div className="main-layout">
        <div className="feed-container">
            <div className="communities-profile">
                <h1 style={{ "textAlign": "center" } as CSSProperties}>My Communities</h1>
                <input type="search" id="myCommunitiesSearchInput" aria-label="Search my communities" placeholder="Search my communities" style={{ "width": "90%", "marginBottom": "10px" } as CSSProperties} />
                <button id="createCommunityButton">Create Community</button>
                <div id="my-communities-container" className="posts-container"></div>
            </div>
            <div className="feed-updates">
                <h1>Communities</h1>
                <input type="search" id="communitiesSearchInput" aria-label="Search communities" placeholder="Search communities" style={{ "width": "90%", "marginBottom": "10px" } as CSSProperties} />
                <div className="posts-container" id="communities-container">
                </div>
            </div>
        </div>
    </div>

            </>
        </PageLifecycle>
    )
}
