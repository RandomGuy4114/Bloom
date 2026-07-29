import BusinessNavigation from "../../../components/BusinessNavigation"
import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/business/settings/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/business/settings/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/business-settings.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Business Settings"
}

export default function MobilePagesBusinessSettingsPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
<BusinessNavigation />
<main className="main-layout"><div className="settings-container settings-dashboard"><header className="settings-header"><p className="settings-eyebrow">Bloom for Business</p><h1>Business Settings</h1><p>Manage preferences for your business account.</p></header><div className="settings-grid">
<section className="settings-card"><h2>Appearance</h2><label htmlFor="businessTheme">Theme</label><select id="businessTheme"></select><button id="saveBusinessTheme">Apply Theme</button></section>
<section className="settings-card"><h2>Language</h2><label htmlFor="businessLanguage">Language</label><select id="businessLanguage"><option value="en">English</option><option value="es">Spanish</option></select><button id="saveBusinessLanguage">Change Language</button></section>
<section className="settings-card"><h2>Business Profile</h2><p>Update your public business information and contact details.</p><button data-business-route="businessProfile">Edit Business Profile</button></section>
<section className="settings-card"><h2>Session</h2><p>Sign out of your Bloom business account on this device.</p><button id="businessLogout" className="secondary-action">Log Out</button></section>
</div><p id="businessSettingsMessage" role="status" aria-live="polite"></p></div></main>
            </>
        </PageLifecycle>
    )
}
