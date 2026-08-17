import { usePathname, useRouter } from "next/navigation"
import { navigateWithViewTransition } from "../lib/view-transition"

export default function BusinessNavigation() {
    const router = useRouter()
    const pathname = usePathname()
    const mobilePrefix = pathname.startsWith("/mobile/") ? "/mobile" : ""
    const routes = {
        businessHome: `${mobilePrefix}/business-home`,
        businessProfile: `${mobilePrefix}/business-profile`,
        businessSettings: `${mobilePrefix}/business-settings`,
        businessDashboard: `${mobilePrefix}/business-dashboard`,
    }
    const routeButton = (route: keyof typeof routes) => ({
        onClick: () => navigateWithViewTransition(router, routes[route]),
        onMouseEnter: () => router.prefetch(routes[route]),
        onFocus: () => router.prefetch(routes[route]),
    })

    return (
        <>
            <header className="topbar">
                <h1 className="topbar-logo">Bloom <span id="verText">BUSINESS</span></h1>
                <nav aria-label="Account" style={{ display: "flex", alignItems: "center" }}>
                    <p id="username-label" style={{ margin: "10px" }}></p>
                    <div className="pfp-frame"></div>
                </nav>
                <div className="topbar-actions" aria-label="Mobile navigation">
                    <div className="topbar-action-row">
                        <button type="button" {...routeButton("businessHome")}>Business Home</button>
                        <button type="button" {...routeButton("businessProfile")}>Business Profile</button>
                    </div>
                    <div className="topbar-action-row">
                        <button type="button" {...routeButton("businessSettings")}>Business Settings</button>
                        <button type="button" {...routeButton("businessDashboard")}>Business Dashboard</button>
                    </div>
                </div>
            </header>
            <aside className="sidebar" aria-label="Business navigation">
                <button type="button" className="sidebarButton" {...routeButton("businessHome")}>Business Home</button>
                <button type="button" className="sidebarButton" {...routeButton("businessProfile")}>Business Profile</button>
                <div className="divider"></div>
                <button type="button" className="sidebarButton" {...routeButton("businessSettings")}>Business Settings</button>
                <button type="button" className="sidebarButton" {...routeButton("businessDashboard")}>Business Dashboard</button>
            </aside>
        </>
    )
}
