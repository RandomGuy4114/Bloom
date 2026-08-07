import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase/client"
import "../../App.css"

function Login() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        document.body.classList.add("login-page")
        document.title = "Bloom - Login"

        return () => {
            document.body.classList.remove("login-page")
        }
    }, [])

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setMessage("")

        const normalizedEmail = email.trim()
        if (!normalizedEmail || !password) {
            setMessage("Please fill in all fields.")
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            })

            if (error) {
                setMessage(error.message)
                return
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("isBusiness")
                .eq("id", data.user.id)
                .maybeSingle()

            if (profileError) {
                console.error("Unable to determine account type:", profileError.message)
            }

            router.replace(profile?.isBusiness === true ? "/business-home" : "/home")
        } catch (error) {
            console.error("Sign-in request failed:", error)
            setMessage("Unable to reach Bloom. Check your connection and try again.")
        } finally {
            setLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        setMessage("")
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: new URL("/callback", window.location.origin).href,
                },
            })

            if (error) {
                setMessage(error.message)
            }
        } catch (error) {
            console.error("Google sign-in failed:", error)
            setMessage("Unable to reach Bloom. Check your connection and try again.")
        } finally {
            setLoading(false)
        }
    }

    async function handleForgotPassword() {
        const normalizedEmail = email.trim()
        if (!normalizedEmail) {
            setMessage("Enter your email address first.")
            document.getElementById("EmailInput")?.focus()
            return
        }

        setLoading(true)
        setMessage("")
        try {
            const redirectTo = new URL("/reset-password", window.location.origin).href
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })

            setMessage(error
                ? "Unable to send a password reset email. Please try again."
                : "If an account exists for that email, a reset link has been sent.")
        } catch (error) {
            console.error("Password reset request failed:", error)
            setMessage("Unable to reach Bloom. Check your connection and try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="CenterBox">
                <h1 style={{ textAlign: "center", marginBottom: 0 }}>Welcome Back To Bloom!</h1>
                <p style={{ textAlign: "center", marginTop: 4, fontSize: 14, color: "grey" }}>
                    Please enter your credentials to access your account.
                </p>

                <form id="loginForm" className="auth-form" onSubmit={handleLogin}>
                    <label htmlFor="EmailInput">Email</label>
                    <input
                        id="EmailInput"
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={loading}
                        required
                    />

                    <label htmlFor="PasswordInput">Password</label>
                    <input
                        id="PasswordInput"
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        required
                    />

                    <button
                        id="forgotPasswordButton"
                        type="button"
                        className="auth-link-button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                    >
                        Forgot password?
                    </button>
                    <p id="error-message" className="form-error" role="status" aria-live="polite">
                        {message}
                    </p>
                    <button id="LoginButton" type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Log In"}
                    </button>
                </form>

                <div className="divider"></div>

                <button className="gsi-material-button" type="button" onClick={handleGoogleSignIn} disabled={loading}>
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: "block"}}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        </div>
                        <span className="gsi-material-button-contents">Sign in with Google</span>
                        <span style={{display: "none"}}>Sign in with Google</span>
                    </div>
                </button>

                <p style={{ fontSize: 15, color: "grey" }}>
                    Don&apos;t have an account? <Link href="/register">Sign up</Link>
                </p>
            </div>

            {loading && (
                <div className="loading-overlay active" role="status" aria-live="polite" aria-label="Loading">
                    <div className="loading-spinner" />
                </div>
            )}
        </>
    )
}

export default Login
