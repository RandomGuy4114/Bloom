"use client"

import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"
import PostFeed from "@/components/posts/PostFeed"
import { useRouter } from "next/navigation"

export const pagePath = "/mobile/pages/app/home/"

const pageMetadata = {
    "bodyClass": "home-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/home/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/home.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Dashboard"
}

export default function PageClient() {
    const router = useRouter()
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation mobile compactMobileHome />
    <div className="TopSection">
        <h1>Bloom <span id="verText">ALPHA</span></h1>
        <div className="BloomConnectPill">
            <div className="BloomConnectStatusCircle" id="bloomConnectStatusCircle" aria-hidden="true"></div>
            <button type="button" className="BloomConnectButton" onClick={() => router.push("/mobile/connect")} aria-label="Open Connect"><i className="ri-walk-line" aria-hidden="true"></i></button>
        </div>
    </div>
    <div className="main-layout">
        <div className="feed-container">
            <div className="feed-updates"><PostFeed emptyMessage="Loading your feed..." /></div>
        </div>
    </div>
    
    

            </>
        </PageLifecycle>
    )
}
