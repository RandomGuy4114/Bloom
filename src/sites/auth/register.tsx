import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase/client"
import "../../App.css"

function formatDateInput(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function yearsAgo(years: number) {
    const date = new Date()
    date.setFullYear(date.getFullYear() - years)
    return formatDateInput(date)
}

function Register() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [birthday, setBirthday] = useState("")
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)

    const youngestBirthday = yearsAgo(13)
    const oldestBirthday = yearsAgo(120)

    useEffect(() => {
        document.body.classList.add("register-page")
        document.title = "Bloom - Register"

        return () => {
            document.body.classList.remove("register-page")
        }
    }, [])

    async function handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setMessage("")

        const normalizedUsername = username.trim()
        const normalizedEmail = email.trim()

        if (!normalizedUsername || !normalizedEmail || !password || !birthday || !termsAccepted) {
            setMessage("Please fill in all fields.")
            return
        }

        if (birthday < oldestBirthday || birthday > youngestBirthday) {
            setMessage("You must be at least 13 years old to create an account.")
            return
        }

        if (!/^[A-Za-z0-9_]{3,30}$/.test(normalizedUsername)) {
            setMessage("Username must be 3–30 characters and contain only letters, numbers, and underscores.")
            return
        }

        if (password.length < 8) {
            setMessage("Password must contain at least 8 characters.")
            return
        }

        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
            setMessage("Password must include uppercase, lowercase, and a number.")
            return
        }

        setLoading(true)
        try {
            const { data: moderation, error: moderationError } = await supabase.functions.invoke("moderate-username", {
                body: { username: normalizedUsername },
            })

            if (moderationError || moderation?.approved !== true) {
                setMessage("That username does not meet the community guidelines. Please choose another one.")
                return
            }

            const { data: usernameAvailable, error: availabilityError } = await supabase.rpc(
                "is_username_available",
                { requested_username: normalizedUsername },
            )

            if (availabilityError) {
                console.error("Unable to check the username:", availabilityError.message)
                setMessage("Unable to check that username. Please try again.")
                return
            }

            if (!usernameAvailable) {
                setMessage("Username already exists. Please choose a different username.")
                return
            }

            const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                    emailRedirectTo: new URL("/confirm", window.location.origin).href,
                    data: {
                        username: normalizedUsername,
                        display_name: normalizedUsername,
                        birthday,
                        accepted_terms: true,
                        terms_version: "2026-07-13",
                        terms_accepted_at: new Date().toISOString(),
                    },
                },
            })

            if (error) {
                setMessage(error.message)
                return
            }

            window.alert("Account created successfully! Please check your email to confirm your account.")
            router.replace("/")
        } catch (error) {
            console.error("Registration request failed:", error)
            setMessage("Unable to reach Bloom. Check your connection and try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="CenterBox">
                <h1 style={{ textAlign: "center", marginBottom: 0 }}>Welcome To Bloom!</h1>
                <p style={{ textAlign: "center", marginTop: 4, fontSize: 14, color: "grey" }}>
                    Please enter your details to create an account.
                </p>

                <form id="registerForm" className="auth-form" onSubmit={handleRegister}>
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        type="text"
                        placeholder="Username"
                        autoComplete="username"
                        minLength={3}
                        maxLength={30}
                        pattern="[A-Za-z0-9_]+"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        disabled={loading}
                        required
                    />

                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={loading}
                        required
                    />

                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        placeholder="Password"
                        autoComplete="new-password"
                        minLength={8}
                        aria-describedby="passwordRequirements"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        required
                    />
                    <p id="passwordRequirements" className="auth-help">
                        Use at least 8 characters with uppercase, lowercase, and a number.
                    </p>

                    <label htmlFor="birthday">Birthday</label>
                    <input
                        id="birthday"
                        type="date"
                        autoComplete="bday"
                        min={oldestBirthday}
                        max={youngestBirthday}
                        value={birthday}
                        onChange={(event) => setBirthday(event.target.value)}
                        disabled={loading}
                        required
                    />

                    <label className="terms-consent" htmlFor="termsAccepted">
                        <input
                            id="termsAccepted"
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(event) => setTermsAccepted(event.target.checked)}
                            disabled={loading}
                            required
                        />
                        <span>
                            I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
                            <Link href="/privacy">Privacy Policy</Link>.
                        </span>
                    </label>

                    <p id="error-message" className="form-error" role="alert" aria-live="polite">
                        {message}
                    </p>
                    <button id="LoginButton" type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <div className="divider"></div>

                <div className="centerLayout">
<button className="gsi-material-button" onClick={async () => {
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
}}
>
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
    <span className="gsi-material-button-contents">Sign up with Google</span>
    <span style={{display: "none"}}>Sign up with Google</span>
</div>
</button>


                </div>




                <p style={{ fontSize: 15, color: "grey" }}>
                    Already have an account? <Link href="/login">Log in</Link>
                </p>
            </div>

            {loading && (
                <div className="loading-overlay" role="status" aria-live="polite" aria-label="Creating your account">
                    <div className="loading-spinner" />
                </div>
            )}
        </>
    )
}

export default Register
