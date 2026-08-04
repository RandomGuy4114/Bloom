import { useNavigate } from "react-router-dom"
import { prefetchRoute } from "../pageRoutes"

interface AppNavigationProps {
    compactMobileHome?: boolean
    mobile?: boolean
    showSidebar?: boolean
    showTopbarActions?: boolean
    sidebarAsAside?: boolean
    usernameLabel?: string
    versionAsSpan?: boolean
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
                <nav id="currentUserNav" style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
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
