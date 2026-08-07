"use client"

import type { CSSProperties } from "react"
import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/mobile/pages/auth/login/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/mobile/pages/auth/login/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/login.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Login"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <div className="CenterBox">
        <h1 style={{ "textAlign": "center", "marginBottom": "0" } as CSSProperties}>Welcome Back To Bloom!</h1>
        <p style={{ "textAlign": "center", "marginTop": "4px", "fontSize": "14px", "color": "grey" } as CSSProperties}>Please enter your credentials to access your account.</p>
        <form id="loginForm" className="auth-form">
            <label htmlFor="EmailInput">Email</label>
            <input id="EmailInput" type="email" placeholder="Email" autoComplete="email" required />
            <label htmlFor="PasswordInput">Password</label>
            <input id="PasswordInput" type="password" placeholder="Password" autoComplete="current-password" required />
            <button id="forgotPasswordButton" type="button" className="auth-link-button">Forgot password?</button>
            <p id="error-message" className="form-error" role="alert" aria-live="polite"></p>
            <button id="LoginButton" type="submit">Log In</button>
        </form>
        <p style={{ "fontSize": "15px", "color": "grey" } as CSSProperties}>Don't have an account? <a href="../register/index.html">Sign up</a></p>
    </div>
    
    

            </>
        </PageLifecycle>
    )
}
