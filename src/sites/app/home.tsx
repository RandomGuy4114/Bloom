import AppNavigation from "../../components/AppNavigation"
import PageLifecycle from "../../components/PageLifecycle"
import PostComposer from "../../components/posts/PostComposer"
import PostFeed from "../../components/posts/PostFeed"

export const pagePath = "/pages/app/home/"

const pageMetadata = {
    "bodyClass": "home-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css"
    ],
    "pagePath": "/pages/app/home/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/home.js",
            "type": "module"
        },
        {
            "source": "../../../js/create-post.js",
            "type": "module"
        },
        {
            "source": "../../../js/communities.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Dashboard"
}

export default function PagesAppHomePage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />
    <div className="main-layout">
        <div className="desktop-home-shell">
            <div className="desktop-home-tabs" role="tablist" aria-label="Home sections">
                <button id="desktopFeedTab" className="desktop-home-tab is-active" type="button" role="tab" data-home-tab="feed" aria-selected="true" aria-controls="desktopFeedPanel">Feed</button>
                <button id="desktopMyCommunitiesTab" className="desktop-home-tab" type="button" role="tab" data-home-tab="my-communities" aria-selected="false" aria-controls="desktopMyCommunitiesPanel">My Communities</button>
                <button id="desktopNearbyCommunitiesTab" className="desktop-home-tab" type="button" role="tab" data-home-tab="nearby-communities" aria-selected="false" aria-controls="desktopNearbyCommunitiesPanel">Nearby Communities</button>
            </div>
            <section id="desktopFeedPanel" className="desktop-home-panel" role="tabpanel" data-home-panel="feed" aria-labelledby="desktopFeedTab">
                <div className="feed-container">
                    <div className="sidebar-profile">
                        <div className="CenterLayout">
                            <div className="pfp-frame"></div>
                            <PostComposer />
                        </div>
                    </div>
                    <div className="feed-updates">
                        <PostFeed emptyMessage="Loading your feed..." />
                    </div>
                </div>
            </section>
            <section id="desktopMyCommunitiesPanel" className="desktop-home-panel" role="tabpanel" data-home-panel="my-communities" aria-labelledby="desktopMyCommunitiesTab" hidden>
                <div className="feed-container">
                    <div className="communities-profile">
                        <h1>My Communities</h1>
                        <input type="search" id="myCommunitiesSearchInput" aria-label="Search my communities" placeholder="Search my communities" />
                        <button id="createCommunityButton" type="button">Create Community</button>
                        <div id="my-communities-container" className="posts-container"></div>
                    </div>
                </div>
            </section>
            <section id="desktopNearbyCommunitiesPanel" className="desktop-home-panel" role="tabpanel" data-home-panel="nearby-communities" aria-labelledby="desktopNearbyCommunitiesTab" hidden>
                <div className="feed-container">
                    <div className="feed-updates">
                        <h1>Nearby Communities</h1>
                        <input type="search" id="communitiesSearchInput" aria-label="Search communities" placeholder="Search communities" />
                        <div id="communities-container" className="posts-container"></div>
                    </div>
                </div>
            </section>
        </div>
    </div>

            </>
        </PageLifecycle>
    )
}
