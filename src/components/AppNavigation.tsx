import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { prefetchRoute } from "../pageRoutes"
import { RiNotification3Fill, RiNotification3Line } from "@remixicon/react"
import { motion } from "motion/react"
import { supabase } from "../lib/supabase"

interface AppNavigationProps {
    compactMobileHome?: boolean
    mobile?: boolean
    showSidebar?: boolean
    showTopbarActions?: boolean
    sidebarAsAside?: boolean
    usernameLabel?: string
    versionAsSpan?: boolean
}

type NotificationType = "post_reply" | "post_like" | "join_request" | "join_approved" | "join_denied"

interface NotificationRecord {
    id: string
    type: NotificationType
    actor_id: string | null
    post_id: string | null
    community_id: string | null
    read: boolean
    created_at: string
}

export default function AppNavigation({
    compactMobileHome = false,
    mobile = false,
    showSidebar = true,
    showTopbarActions = true,
    sidebarAsAside = false,
    usernameLabel = "",
    versionAsSpan = false,
}: AppNavigationProps) {
    const navigate = useNavigate()
    const destination = (page: string) => mobile ? `/mobile/${page}` : `/${page}`
    const goTo = (page: string) => {
        navigate(destination(page))
    }
    const preload = (page: string) => {
        void prefetchRoute(destination(page))
    }
    const SidebarElement = sidebarAsAside ? "aside" : "div"

    const [notifMenuOpen, setNotifMenuOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotificationRecord[]>([])
    const [actorNames, setActorNames] = useState<Record<string, string>>({})
    const [communityNames, setCommunityNames] = useState<Record<string, string>>({})
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        let cancelled = false

        async function loadUnreadCount() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return
            const { count } = await supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("read", false)
            if (!cancelled) setUnreadCount(count ?? 0)
        }

        void loadUnreadCount()
        return () => {
            cancelled = true
        }
    }, [])

    async function loadNotifications() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from("notifications")
            .select("id, type, actor_id, post_id, community_id, read, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)

        const records = (data ?? []) as NotificationRecord[]
        setNotifications(records)

        const actorIds = [...new Set(records.map((record) => record.actor_id).filter((id): id is string => Boolean(id)))]
        const communityIds = [...new Set(records.map((record) => record.community_id).filter((id): id is string => Boolean(id)))]

        if (actorIds.length) {
            const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", actorIds)
            setActorNames(Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.display_name || profile.username || "Someone"])))
        }
        if (communityIds.length) {
            const { data: communities } = await supabase.from("Communities").select("id, name").in("id", communityIds)
            setCommunityNames(Object.fromEntries((communities ?? []).map((community) => [community.id, community.name || "a community"])))
        }

        const unreadIds = records.filter((record) => !record.read).map((record) => record.id)
        if (unreadIds.length) {
            await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
            setUnreadCount(0)
        }
    }

    function toggleNotifMenu() {
        const opening = !notifMenuOpen
        setNotifMenuOpen(opening)
        if (opening) {
            void loadNotifications()
        }
    }

    function describeNotification(notification: NotificationRecord) {
        const actorName = notification.actor_id ? (actorNames[notification.actor_id] || "Someone") : "Someone"
        const communityName = notification.community_id ? (communityNames[notification.community_id] || "a community") : "a community"
        switch (notification.type) {
            case "post_reply":
                return `${actorName} replied to your post`
            case "post_like":
                return `${actorName} liked your post`
            case "join_request":
                return `${actorName} requested to join ${communityName}`
            case "join_approved":
                return `Your request to join ${communityName} was approved`
            case "join_denied":
                return `Your request to join ${communityName} was denied`
            default:
                return "New notification"
        }
    }

    function handleNotificationClick(notification: NotificationRecord) {
        setNotifMenuOpen(false)
        if (notification.type === "post_reply" || notification.type === "post_like") {
            if (notification.post_id) goTo(`post?postId=${notification.post_id}`)
            return
        }
        if (notification.community_id) {
            goTo(`community?communityID=${notification.community_id}`)
        }
    }

    return (
        <>
            <div className="topbar">
                <div className="topbar-actions" aria-label="Mobile navigation">
                    {!compactMobileHome && showTopbarActions && (
                        <>
                            <div className="topbar-action-row">
                                <button onMouseEnter={() => preload("home")} onFocus={() => preload("home")} onClick={() => goTo("home")}>Home</button>
                                <button onMouseEnter={() => preload("profile")} onFocus={() => preload("profile")} onClick={() => goTo("profile")}>Profile</button>
                                <button onMouseEnter={() => preload("calendar")} onFocus={() => preload("calendar")} onClick={() => goTo("calendar")}>Calendar</button>
                            </div>
                            <div className="topbar-action-row">
                                <button onMouseEnter={() => preload("map")} onFocus={() => preload("map")} onClick={() => goTo("map")}>Map</button>
                                <button onMouseEnter={() => preload("messages")} onFocus={() => preload("messages")} onClick={() => goTo("messages")}>Direct Messages</button>
                                <button onMouseEnter={() => preload("settings")} onFocus={() => preload("settings")} onClick={() => goTo("settings")}>Settings</button>
                            </div>
                        </>
                    )}
                </div>
                <div className="notifWrapper">
                    <button type="button" className="notifButton" aria-label="Notifications" aria-haspopup="menu" aria-expanded={notifMenuOpen} onClick={toggleNotifMenu}>
                        {notifMenuOpen ? <RiNotification3Fill size={20} /> : <RiNotification3Line size={20} />}
                        {unreadCount > 0 && <span className="notifBadge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>
                    <motion.div
                        className="notifMenu"
                        style={{ display: notifMenuOpen ? "flex" : "none" }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: notifMenuOpen ? 1 : 0, y: notifMenuOpen ? 0 : -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <p className="notifMenuHeader">Notifications</p>
                        <div className="divider"></div>
                        <div className="notifMenuContent">
                            {notifications.length === 0 && <p className="notifMenuEmpty">No notifications yet</p>}
                            {notifications.map((notification) => (
                                <button
                                    type="button"
                                    key={notification.id}
                                    className="notifMenuItem"
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    {describeNotification(notification)}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
                <nav id="currentUserNav" style={{ display: "flex", alignItems: "center" }}>
                    <p id="username-label" style={{ margin: "10px" }}>{usernameLabel}</p>
                    <div className="pfp-frame"></div>
                </nav>
            </div>
            {showSidebar && (
                <SidebarElement className="sidebar">
                    <h1 className="topbar-logo">
                        Bloom {versionAsSpan ? <span id="verText">ALPHA</span> : <p id="verText">ALPHA</p>}
                    </h1>
                    <button onMouseEnter={() => preload("home")} onFocus={() => preload("home")} onClick={() => goTo("home")} className="sidebarButton">Home</button>
                    <button onMouseEnter={() => preload("profile")} onFocus={() => preload("profile")} onClick={() => goTo("profile")} className="sidebarButton">Profile</button>
                    <button onMouseEnter={() => preload("calendar")} onFocus={() => preload("calendar")} onClick={() => goTo("calendar")} className="sidebarButton">Calendar</button>
                    <div className="divider"></div>
                    <button className="sidebarButton" onMouseEnter={() => preload("map")} onFocus={() => preload("map")} onClick={() => goTo("map")}>Map</button>
                    {!compactMobileHome && <button className="sidebarButton" onMouseEnter={() => preload("messages")} onFocus={() => preload("messages")} onClick={() => goTo("messages")}>Direct Messages</button>}
                    <div className="divider"></div>
                    <button className="sidebarButton" onMouseEnter={() => preload("settings")} onFocus={() => preload("settings")} onClick={() => goTo("settings")}>Settings</button>
                    <button type="button" className="sidebarButton supporter-button" onMouseEnter={() => preload("supporter")} onFocus={() => preload("supporter")} onClick={() => goTo("supporter")}>Buy Bloom Supporter</button>
                </SidebarElement>
            )}
        </>
    )
}
