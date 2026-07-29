import AppNavigation from "../../../components/AppNavigation"
import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/app/connect/"

const pageMetadata = {
    "bodyClass": "app-page connect-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/connect/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/connect-page.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Connect"
}

export default function MobilePagesAppConnectPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation sidebarAsAside versionAsSpan showTopbarActions={false} />
    <main className="main-layout">
        <section className="settings-container connect-panel">
            <h1>Connect</h1>
            <p>Connect can alert you when you cross paths with an opted-in member of one of your communities.</p>
            <p id="connectPageStatus" className="settings-help" aria-live="polite">Checking Connect...</p>
            <button id="manageConnectButton" type="button">Manage Connect Settings</button>
            <div className="divider"></div>
            <h2>Connected people</h2>
            <div id="connectedUsers" className="connected-users" aria-live="polite"></div>
        </section>
    </main>
    
    

            </>
        </PageLifecycle>
    )
}
