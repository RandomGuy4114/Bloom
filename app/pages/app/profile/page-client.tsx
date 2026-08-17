"use client"

import type { CSSProperties } from "react"
import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/app/profile/"

const pageMetadata = {
    "bodyClass": "profile-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/app/profile/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/profile.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Profile"
}

interface InitialData {
    id: string | null
    display_name: string | null
    username: string | null
    Language: string | null
    joined_communities: string[] | null
}

export default function PageClient({ initialData }: { initialData: InitialData }) {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />

    <div className="main-layout" style={{ "marginTop": "var(--topbar-height)" } as CSSProperties}>
        <div className="feed-container" style={{ "gap": "20px", "width": "100%" } as CSSProperties}>
            
            <div className="profile-sidebar">
                <div className="profile-header">
                    <div className="profile-pfp"></div>
                    <div className="profile-info">
                        <h2 className="profile-name">{initialData.display_name}</h2>
                        <p className="profile-username">{initialData.username}</p>
                    </div>
                </div>
                <div className="profile-details"></div>
                <div className="profile-status">
                    <div className="statusSection">
                        <h2 id="profileCommunitiesCount">{initialData.joined_communities?.length || 0}</h2>
                        <p>Communities</p>
                    </div>
                    <div className="statusSection">
                        <h2 id="profilePostsCount">0</h2>
                        <p>Posts</p>
                    </div>
                    <div className="statusSection">
                        <h2 id="profileRepliesCount">0</h2>
                        <p>Replies</p>
                    </div>
                    <div className="statusSection">
                        <h2>🌱 <span id="profileStreakCount">0</span></h2>
                        <p>Day Streak</p>
                    </div>
                </div>
                <button type="button" id="editProfileButton" className="edit-profile-button" hidden>Edit Profile</button>
                <button type="button" id="blockProfileButton" className="block-profile-button" hidden>Block User</button>
            </div>

            <div className="profile-posts">
                <h2>Posts</h2>
                <div className="posts-container">
                    <div className="loadingSkeletonPost">
                        <div className="loadingSkeleton"></div>
                        <div className="loadingSkeleton" style={{width: "50%"}}></div>
                        <div className="loadingSkeleton" style={{width: "30%"}}></div>
                    </div>
                </div>
            </div>

        </div>
    </div>
    
    

            </>
        </PageLifecycle>
    )
}
