import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"
import PostComposer from "@/components/posts/PostComposer"
import PostFeed from "@/components/posts/PostFeed"
import WarningPopup from "@/components/warningPopup"
import React from "react"
import { supabase } from "@/lib/supabase/client"
import { motion } from "motion/react"

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
            "source": "../../../js/create-post.js",
            "type": "module"
        },
        {
            "source": "../../../js/communities.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Home"
}

interface InitialData {
    id: string | null
    display_name: string | null
    Language: string | null
    warning: string | null
    joined_communities: string[] | null
}

interface InitialComms {
    id: string | null
    name: string | null
    description: string | null
    private: boolean | null
    members: string[] | null
    latitude: number | null
    longitude: number | null
    radius_meters: number | null
}

export default function PageClient({
    initialData,
    initialComms: _initialComms,
}: {
    initialData: InitialData | null
    initialComms: InitialComms[] | null
}) {
    const [warningMessage, setWarningMessage] = React.useState<string | null>(initialData?.warning ?? null)
    const [greeting, setGreeting] = React.useState<string>("")

    const homeTabs = ["feed", "my-communities", "nearby-communities"] as const
    type HomeTab = typeof homeTabs[number]
    const [activeTab, setActiveTab] = React.useState<HomeTab>("feed")
    const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])

    function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
        event.preventDefault()
        const direction = event.key === "ArrowRight" ? 1 : -1
        const nextIndex = (index + direction + homeTabs.length) % homeTabs.length
        setActiveTab(homeTabs[nextIndex])
        tabRefs.current[nextIndex]?.focus()
    }


    React.useEffect(() => {
        if (initialData?.display_name) {
            const time = new Date().getHours()
            let greetingMessage = ""
            if (time < 12) {
                greetingMessage = `Good morning, ${initialData.display_name || "Bloom user"}!`
            } else if (time < 18) {
                greetingMessage = `Good afternoon, ${initialData.display_name || "Bloom user"}!`
            } else {
                greetingMessage = `Good evening, ${initialData.display_name || "Bloom user"}!`
            }
            setGreeting(greetingMessage)
        }
    }, [initialData])

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
    <AppNavigation initialDisplayName={initialData?.display_name} />
    <div className="main-layout">
        <div className="desktop-home-shell">
            <div className="greeting-group">
                <h1 id="Greeting">{greeting}</h1>
            </div>
            <div className="desktop-home-tabs" role="tablist" aria-label="Home sections">
                {homeTabs.map((tab, index) => (
                    <button
                        key={tab}
                        ref={(element) => { tabRefs.current[index] = element }}
                        id={`desktop${tab === "feed" ? "Feed" : tab === "my-communities" ? "MyCommunities" : "NearbyCommunities"}Tab`}
                        className={`desktop-home-tab${activeTab === tab ? " is-active" : ""}`}
                        type="button"
                        role="tab"
                        data-home-tab={tab}
                        aria-selected={activeTab === tab}
                        aria-controls={`desktop${tab === "feed" ? "Feed" : tab === "my-communities" ? "MyCommunities" : "NearbyCommunities"}Panel`}
                        tabIndex={activeTab === tab ? 0 : -1}
                        onClick={() => setActiveTab(tab)}
                        onKeyDown={(event) => handleTabKeyDown(event, index)}
                    >
                        {tab === "feed" ? "Feed" : tab === "my-communities" ? "My Communities" : "Nearby Communities"}
                    </button>
                ))}
                <button id="createCommunityButton" type="button">Create Community</button>
            </div>
            <motion.section
                id="desktopFeedPanel"
                className="desktop-home-panel"
                role="tabpanel"
                data-home-panel="feed"
                aria-labelledby="desktopFeedTab"
                hidden={activeTab !== "feed"}
                initial={false}
                animate={{ opacity: activeTab === "feed" ? 1 : 0, y: activeTab === "feed" ? 0 : 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
            >
                <div className="feed-container">
                    <div className="sidebar-profile">
                        <PostComposer compact />
                    </div>
                    <div className="feed-updates">
                        <PostFeed emptyMessage="Loading your feed..." />
                    </div>
                </div>
            </motion.section>
            <motion.section
                id="desktopMyCommunitiesPanel"
                className="desktop-home-panel"
                role="tabpanel"
                data-home-panel="my-communities"
                aria-labelledby="desktopMyCommunitiesTab"
                hidden={activeTab !== "my-communities"}
                initial={false}
                animate={{ opacity: activeTab === "my-communities" ? 1 : 0, y: activeTab === "my-communities" ? 0 : 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
            >
                <div className="feed-container">
                    <div className="communities-profile">
                        <div id="my-communities-container" className="posts-container">
                            <div className="loadingSkeletonPost" style={{height: "70px"}}>
                                <div className="loadingSkeleton"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>
            <motion.section
                id="desktopNearbyCommunitiesPanel"
                className="desktop-home-panel"
                role="tabpanel"
                data-home-panel="nearby-communities"
                aria-labelledby="desktopNearbyCommunitiesTab"
                hidden={activeTab !== "nearby-communities"}
                initial={false}
                animate={{ opacity: activeTab === "nearby-communities" ? 1 : 0, y: activeTab === "nearby-communities" ? 0 : 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
            >
                <div className="feed-container">
                    <div className="feed-updates">
                        <div id="communities-container" className="posts-container">
                            <div className="loadingSkeletonPost" style={{height: "70px"}}>
                                <div className="loadingSkeleton"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>
        </div>
        <WarningPopup visible={warningMessage !== null} message={warningMessage ?? ""} onClose={() => { void dismissWarning() }} />
    </div>

            </>
        </PageLifecycle>
    )
}
