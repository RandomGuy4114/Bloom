"use client"

import AppNavigation from "@/components/AppNavigation"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/app/settings/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/app/settings/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/settings.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Settings"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />
    <div className="main-layout">
        <div className="settings-container settings-dashboard">
            <header className="settings-header">
                <h1>Settings</h1>
                <p>Manage your account, appearance, language, and preview features.</p>
            </header>
            <div className="settings-grid">
                <section className="settings-card">
                    <h2>Appearance</h2>
                    <p>Choose how Bloom looks across your account.</p>
                    <label htmlFor="ThemeDropdown">Theme</label>
                    <select id="ThemeDropdown" aria-label="Select theme"></select>
                    <p id="themeSupporterHint" className="settings-help"></p>
                    <button id="changeThemeButton">Apply Theme</button>
                </section>
                <section className="settings-card">
                    <h2>Language</h2>
                    <p>Choose the language used throughout Bloom.</p>
                    <label htmlFor="LangDropdown">Language</label>
                    <select id="LangDropdown" {...{ label: "Language" }} aria-label="Select Language">
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                    </select>
                    <button id="changeLangButton">Change Language</button>
                </section>
                <section className="settings-card">
                    <h2>Early Access</h2>
                    <p>Preview experimental Bloom features before their public release.</p>
                    <button id="earlyAccessButton">Open Early Access</button>
                </section>
                <section className="settings-card">
                    <h2>Connect</h2>
                    <p>Optionally use background location to alert you when you cross paths with an opted-in member of one of your communities.</p>
                    <label className="settings-toggle" htmlFor="connectEnabledToggle">
                        <input id="connectEnabledToggle" type="checkbox" />
                        <span>Enable proximity alerts</span>
                    </label>
                    <p id="connectStatus" className="settings-help" aria-live="polite">Connect is off.</p>
                </section>
                <section className="settings-card">
                    <h2>Account Settings</h2>
                    <p>Manage your password and account session.</p>
                    <div className="settings-actions">
                        <button id="changePasswordButton">Change Password</button>
                        <button id="logoutButton" className="secondary-action">Logout</button>
                        <button id="deleteAccountButton" className="danger-action">Delete Account</button>
                    </div>
                </section>
                <section className="settings-card">
                    <h2>Achievements</h2>
                    <p>View your achievements and progress.</p>
                    <button id="viewAchievementsButton">View Achievements</button>
                </section>
            </div>
        </div>
    </div>

            </>
        </PageLifecycle>
    )
}
