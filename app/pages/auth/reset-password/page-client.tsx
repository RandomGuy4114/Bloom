"use client"

import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/auth/reset-password/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/auth/reset-password/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/reset-password.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Reset Password"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <div className="CenterBox">
        <h1>Reset Password</h1>
        <p className="auth-intro">Choose a new password for your Bloom account.</p>
        <form id="resetPasswordForm" className="auth-form">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
            <p className="auth-help">Use at least 8 characters with uppercase, lowercase, and a number.</p>
            <p id="error-message" className="form-error" role="alert" aria-live="polite"></p>
            <button type="submit">Update password</button>
        </form>
    </div>
    
    

            </>
        </PageLifecycle>
    )
}
