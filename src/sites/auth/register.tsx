import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../../supabase"
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
    const navigate = useNavigate()
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
            navigate("/", { replace: true })
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
                            I agree to the <Link to="/terms">Terms of Service</Link> and{" "}
                            <Link to="/privacy">Privacy Policy</Link>.
                        </span>
                    </label>

                    <p id="error-message" className="form-error" role="alert" aria-live="polite">
                        {message}
                    </p>
                    <button id="LoginButton" type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <p style={{ fontSize: 15, color: "grey" }}>
                    Already have an account? <Link to="/login">Log in</Link>
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
