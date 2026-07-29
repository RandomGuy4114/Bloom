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
    const appRoot = mobile ? "/mobile/pages/app" : "/pages/app"
    const suffix = mobile ? "/index.html" : "/"
    const destination = (page: string) => `${appRoot}/${page}${suffix}`
    const goTo = (page: string) => {
        window.location.href = destination(page)
    }
    const SidebarElement = sidebarAsAside ? "aside" : "div"

    return (
        <>
            <div className="topbar">
                {!compactMobileHome && (
                    <h1 className="topbar-logo">
                        Bloom {versionAsSpan ? <span id="verText">ALPHA</span> : <p id="verText">ALPHA</p>}
                    </h1>
                )}
                <nav style={{ display: "flex", alignItems: "center" }}>
                    <p id="username-label" style={{ margin: "10px" }}>{usernameLabel}</p>
                    <div className="pfp-frame"></div>
                </nav>
                <div className="topbar-actions" aria-label="Mobile navigation">
                    {!compactMobileHome && showTopbarActions && (
                        <>
                            <div className="topbar-action-row">
                                <button onClick={() => goTo("home")}>Home</button>
                                <button onClick={() => goTo("profile")}>Profile</button>
                                <button onClick={() => goTo("calendar")}>Calendar</button>
                            </div>
                            <div className="topbar-action-row">
                                <button onClick={() => goTo("map")}>Map</button>
                                <button onClick={() => goTo("messages")}>Direct Messages</button>
                                <button onClick={() => goTo("settings")}>Settings</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {showSidebar && (
                <SidebarElement className="sidebar">
                    <button onClick={() => goTo("home")} className="sidebarButton">Home</button>
                    <button onClick={() => goTo("profile")} className="sidebarButton">Profile</button>
                    <button onClick={() => goTo("calendar")} className="sidebarButton">Calendar</button>
                    <div className="divider"></div>
                    <button className="sidebarButton" onClick={() => goTo("map")}>Map</button>
                    {!compactMobileHome && <button className="sidebarButton" onClick={() => goTo("messages")}>Direct Messages</button>}
                    <div className="divider"></div>
                    <button className="sidebarButton" onClick={() => goTo("settings")}>Settings</button>
                    <button type="button" className="sidebarButton supporter-button" onClick={() => goTo("supporter")}>Buy Bloom Supporter</button>
                </SidebarElement>
            )}
        </>
    )
}
