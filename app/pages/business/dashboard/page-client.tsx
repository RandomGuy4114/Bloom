"use client"

import BusinessNavigation from "@/components/BusinessNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/business/dashboard/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/business/dashboard/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/business-dashboard.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Business Dashboard"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
<BusinessNavigation />
<main className="main-layout"><div className="settings-container settings-dashboard"><header className="settings-header"><p className="settings-eyebrow">Bloom for Business</p><h1>Business Dashboard</h1><p>A summary of your business account and public information.</p></header>
<div className="business-metric-grid"><section className="settings-card"><span>Profile completion</span><strong id="profileCompletion">0%</strong><progress id="profileCompletionBar" max="100" value="0"></progress></section><section className="settings-card"><span>Account status</span><strong>Business</strong><p id="accountCreated"></p></section><section className="settings-card"><span>Contact methods</span><strong id="contactMethodCount">0</strong><p>Email, phone, and website details currently available.</p></section><section className="settings-card"><span>Location status</span><strong id="locationStatus">Not added</strong><p>Add an address and coordinates from your Business Profile.</p></section></div>
<section className="settings-card"><h2>Complete your business profile</h2><p id="dashboardRecommendation">Add information to help people understand and contact your business.</p><button data-business-route="businessProfile">Edit Business Profile</button></section>
</div></main>
            </>
        </PageLifecycle>
    )
}
