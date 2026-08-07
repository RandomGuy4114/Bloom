import AppNavigation from "../../components/AppNavigation"
import PageLifecycle from "../../components/PageLifecycle"
import PostComposer from "../../components/posts/PostComposer"
import PostFeed from "../../components/posts/PostFeed"
import WarningPopup from "../../components/warningPopup"
import React from "react"
import { supabase } from "../../lib/supabase/client"

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
    const [warningMessage, setWarningMessage] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false

        async function loadWarning() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return

            const { data, error } = await supabase
                .from("profiles")
                .select("warning")
                .eq("id", user.id)
                .single()

            if (error) {
                console.error("Error fetching user warning:", error.message)
                return
            }
            if (!cancelled && data?.warning) {
                setWarningMessage(data.warning)
            }
        }

        void loadWarning()
        return () => {
            cancelled = true
        }
    }, [])

    async function dismissWarning() {
        setWarningMessage(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error } = await supabase.from("profiles").update({ warning: null }).eq("id", user.id)
        if (error) {
            console.error("Error clearing user warning:", error.message)
        }
    }

    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />
    <div className="main-layout">
        <div className="desktop-home-shell">
            <div className="greeting-group">
                <h1 id="Greeting"></h1>
            </div>
            <div className="desktop-home-tabs" role="tablist" aria-label="Home sections">
                <button id="desktopFeedTab" className="desktop-home-tab is-active" type="button" role="tab" data-home-tab="feed" aria-selected="true" aria-controls="desktopFeedPanel">Feed</button>
                <button id="desktopMyCommunitiesTab" className="desktop-home-tab" type="button" role="tab" data-home-tab="my-communities" aria-selected="false" aria-controls="desktopMyCommunitiesPanel">My Communities</button>
                <button id="desktopNearbyCommunitiesTab" className="desktop-home-tab" type="button" role="tab" data-home-tab="nearby-communities" aria-selected="false" aria-controls="desktopNearbyCommunitiesPanel">Nearby Communities</button>
                <button id="createCommunityButton" type="button">Create Community</button>
            </div>
            <section id="desktopFeedPanel" className="desktop-home-panel" role="tabpanel" data-home-panel="feed" aria-labelledby="desktopFeedTab">
                <div className="feed-container">
                    <div className="sidebar-profile">
                        <PostComposer compact />
                    </div>
                    <div className="feed-updates">
                        <PostFeed emptyMessage="Loading your feed..." />
                    </div>
                </div>
            </section>
            <section id="desktopMyCommunitiesPanel" className="desktop-home-panel" role="tabpanel" data-home-panel="my-communities" aria-labelledby="desktopMyCommunitiesTab" hidden>
                <div className="feed-container">
                    <div className="communities-profile">
                        <div id="my-communities-container" className="posts-container"></div>
                    </div>
                </div>
            </section>
            <section id="desktopNearbyCommunitiesPanel" className="desktop-home-panel" role="tabpanel" data-home-panel="nearby-communities" aria-labelledby="desktopNearbyCommunitiesTab" hidden>
                <div className="feed-container">
                    <div className="feed-updates">
                        <div id="communities-container" className="posts-container"></div>
                    </div>
                </div>
            </section>
        </div>
        <WarningPopup visible={warningMessage !== null} message={warningMessage ?? ""} onClose={() => { void dismissWarning() }} />
    </div>

            </>
        </PageLifecycle>
    )
}
