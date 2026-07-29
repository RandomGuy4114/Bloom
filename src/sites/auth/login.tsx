import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../supabase"
import "../../App.css"

function Login() {
    const navigate = useNavigate()
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

            navigate(profile?.isBusiness === true ? "/business-home" : "/home", { replace: true })
        } catch (error) {
            console.error("Sign-in request failed:", error)
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

                <p style={{ fontSize: 15, color: "grey" }}>
                    Don&apos;t have an account? <Link to="/register">Sign up</Link>
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
