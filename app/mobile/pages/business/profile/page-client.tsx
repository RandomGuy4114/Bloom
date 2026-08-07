"use client"

import BusinessNavigation from "@/components/BusinessNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/mobile/pages/business/profile/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/business/profile/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/business-profile.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Business Profile"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <BusinessNavigation />
    <main className="main-layout">
        <div className="settings-container settings-dashboard">
            <header className="settings-header"><p className="settings-eyebrow">Bloom for Business</p><h1>Business Profile</h1><p>Manage the information customers can use to identify and contact your business.</p></header>
            <form id="businessProfileForm" className="business-profile-form">
                <section className="settings-card">
                    <h2>Business Information</h2>
                    <label htmlFor="businessName">Business name</label>
                    <input id="businessName" maxLength={50} required />
                    <label htmlFor="businessDescription">Business description</label>
                    <textarea id="businessDescription" maxLength={1500} rows={6}></textarea>
                    <label htmlFor="businessLocation">Business address or location</label>
                    <input id="businessLocation" maxLength={300} autoComplete="street-address" />
                    <div className="business-coordinate-grid">
                        <div><label htmlFor="businessLatitude">Latitude</label><input id="businessLatitude" type="number" min="-90" max="90" step="any" /></div>
                        <div><label htmlFor="businessLongitude">Longitude</label><input id="businessLongitude" type="number" min="-180" max="180" step="any" /></div>
                    </div>
                    <button id="useBusinessLocation" type="button" className="secondary-action">Use My Current Location</button>
                </section>
                <section className="settings-card">
                    <h2>Contact Information</h2>
                    <label htmlFor="businessEmail">Public contact email</label>
                    <input id="businessEmail" type="email" maxLength={254} autoComplete="email" />
                    <label htmlFor="businessPhone">Public phone number</label>
                    <input id="businessPhone" type="tel" maxLength={40} autoComplete="tel" />
                    <label htmlFor="businessWebsite">Website</label>
                    <input id="businessWebsite" type="url" maxLength={2048} pattern="https://.*" title="Use a secure address beginning with https://" placeholder="https://example.com" autoComplete="url" />
                    <p id="businessProfileMessage" className="form-error" role="status" aria-live="polite"></p>
                    <button type="submit">Save Business Profile</button>
                </section>
            </form>
        </div>
    </main>
    
    

            </>
        </PageLifecycle>
    )
}
