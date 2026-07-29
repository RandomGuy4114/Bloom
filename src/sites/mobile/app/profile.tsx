import type { CSSProperties } from "react"
import AppNavigation from "../../../components/AppNavigation"
import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/app/profile/"

const pageMetadata = {
    "bodyClass": "profile-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/profile/",
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

export default function MobilePagesAppProfilePage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation mobile />

    <div className="main-layout" style={{ "marginTop": "var(--topbar-height)" } as CSSProperties}>
        <div className="feed-container" style={{ "gap": "20px", "width": "100%" } as CSSProperties}>
            
            <div className="profile-sidebar">
                <div className="profile-pfp"></div>
                <h2 className="profile-name"></h2>
                <p className="profile-username"></p>
                <div className="profile-details"></div>
                <button type="button" id="editProfileButton" className="edit-profile-button" hidden>Edit Profile</button>
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
