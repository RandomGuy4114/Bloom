"use client"

import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/mobile/pages/app/early-access/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/early-access/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/early-access.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Early Access"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation mobile />
    <main className="main-layout">
        <section className="settings-container settings-dashboard">
            <header className="settings-header">
                <h1>Early Access</h1>
                <p>Preview experimental features before they are released to everyone.</p>
            </header>
            <div id="earlyAccessContent" className="settings-card early-access-card"></div>
        </section>
    </main>
    
    

            </>
        </PageLifecycle>
    )
}
