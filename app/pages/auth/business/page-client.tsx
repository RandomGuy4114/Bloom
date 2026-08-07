"use client"

import type { CSSProperties } from "react"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/auth/business/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/auth/business/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/company-register.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Business Register"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <div className="CenterBox">
        <h1 style={{ "textAlign": "center", "marginBottom": "0" } as CSSProperties}>Register a Business Account</h1>
        <p style={{ "textAlign": "center", "marginTop": "4px", "fontSize": "14px", "color": "grey" } as CSSProperties}>Please enter your details to create an account.</p>
        <form id="registerForm" className="auth-form">
            <label htmlFor="username">Business Username</label>
            <input id="username" type="text" placeholder="Username" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" required />
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="Email" autoComplete="email" required />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="Password" autoComplete="new-password" minLength={8} aria-describedby="passwordRequirements" required />
            <p id="passwordRequirements" className="auth-help">Use at least 8 characters with uppercase, lowercase, and a number.</p>
            <label htmlFor="birthday">Birthday</label>
            <input id="birthday" type="date" autoComplete="bday" min="1906-01-01" required />
            <label className="terms-consent" htmlFor="termsAccepted">
                <input id="termsAccepted" type="checkbox" required />
                <span>I agree to the <a href="../../legal/terms/">Terms of Service</a> and <a href="../../legal/privacy/">Privacy Policy</a>.</span>
            </label>
            <p id="error-message" className="form-error" role="alert" aria-live="polite"></p>
            <button id="LoginButton" type="submit">Sign Up</button>
        </form>
        <p style={{ "fontSize": "15px", "color": "grey" } as CSSProperties}>Already have an account? <a href="../login/">Log in</a></p>
    </div>
    
    

            </>
        </PageLifecycle>
    )
}
