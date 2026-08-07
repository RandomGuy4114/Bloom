"use client"

import BusinessNavigation from "@/components/BusinessNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/business/home/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/business/home/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/business-home.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Business Home"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <BusinessNavigation />

    <main className="main-layout">
        <div className="settings-container settings-dashboard">
            <header className="settings-header">
                <h1 id="businessWelcome">Welcome to your business account</h1>
                <p>Connect with nearby communities and manage your presence on Bloom.</p>
            </header>
            <div className="settings-grid">
                <section className="settings-card business-community-card">
                    <h2>Business Communities <span className="business-community-tag">Business</span></h2>
                    <p>Create a promoted community at a custom location with an active Bloom Business Patreon membership.</p>
                    <p id="businessTierStatus" role="status" aria-live="polite"></p>
                    <button id="createBusinessCommunity" type="button">Create Business Community</button>
                    <button id="connectBusinessPatreon" type="button" className="secondary-action">Connect Business Patreon</button>
                </section>
                <section className="settings-card">
                    <h2>Business Profile</h2>
                    <p>View and update the public profile people see across Bloom.</p>
                    <button type="button" data-business-route="businessProfile">Open Profile</button>
                </section>
                <section className="settings-card">
                    <h2>Business Dashboard</h2>
                    <p>Review your business account status and profile completion.</p>
                    <button type="button" data-business-route="businessDashboard">Open Dashboard</button>
                </section>
                <section className="settings-card">
                    <h2>Contact Information</h2>
                    <p>Add your public location, website, email address, and phone number.</p>
                    <button type="button" data-business-route="businessProfile">Edit Contact Details</button>
                </section>
                <section className="settings-card">
                    <h2>Account Settings</h2>
                    <p>Manage your language, theme, password, and account preferences.</p>
                    <button type="button" data-business-route="businessSettings">Open Settings</button>
                </section>
            </div>
            <section className="settings-card">
                <h2>Your Business Communities</h2>
                <div id="businessCommunityList" className="posts-container"></div>
            </section>
            <section className="settings-card">
                <h2>Publish a Business Post</h2>
                <p>Posts may occasionally be recommended to nearby Bloom users within the community radius.</p>
                <form id="businessPostForm" className="popup-form">
                    <label htmlFor="businessPostCommunity">Business community</label>
                    <select id="businessPostCommunity" required></select>
                    <label htmlFor="businessPostTitle">Post title</label>
                    <input id="businessPostTitle" maxLength={200} required />
                    <label htmlFor="businessPostBody">Post content</label>
                    <textarea id="businessPostBody" maxLength={10000} required></textarea>
                    <button type="submit">Publish Business Post</button>
                </form>
            </section>
        </div>
    </main>

    
    

            </>
        </PageLifecycle>
    )
}
