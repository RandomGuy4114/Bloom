import type { CSSProperties } from "react"
import AppNavigation from "../../components/AppNavigation"
import PageLifecycle from "../../components/PageLifecycle"

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

export default function PagesAppProfilePage() {
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
                        <h2 className="profile-name"></h2>
                        <p className="profile-username"></p>
                    </div>
                </div>
                <div className="profile-details"></div>
                <div className="profile-status">
                    <div className="statusSection">
                        <h2 id="profileCommunitiesCount">0</h2>
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
                <div className="posts-container"></div>
            </div>

        </div>
    </div>
    
    

            </>
        </PageLifecycle>
    )
}
