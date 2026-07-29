export default function BusinessNavigation() {
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
                        <button type="button" data-business-route="businessHome">Business Home</button>
                        <button type="button" data-business-route="businessProfile">Business Profile</button>
                    </div>
                    <div className="topbar-action-row">
                        <button type="button" data-business-route="businessSettings">Business Settings</button>
                        <button type="button" data-business-route="businessDashboard">Business Dashboard</button>
                    </div>
                </div>
            </header>
            <aside className="sidebar" aria-label="Business navigation">
                <button type="button" className="sidebarButton" data-business-route="businessHome">Business Home</button>
                <button type="button" className="sidebarButton" data-business-route="businessProfile">Business Profile</button>
                <div className="divider"></div>
                <button type="button" className="sidebarButton" data-business-route="businessSettings">Business Settings</button>
                <button type="button" className="sidebarButton" data-business-route="businessDashboard">Business Dashboard</button>
            </aside>
        </>
    )
}
