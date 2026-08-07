import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../../lib/supabase/client"
import PageLifecycle from "../../components/PageLifecycle"
import "../../App.css"

export const pagePath = "/pages/auth/callback"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/auth/callback/",
    "redirect": null,
    "scripts": [],
    "styles": [],
    "title": "Bloom - Logging In"
}

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

function suggestUsername(user: User) {
    const source = (user.user_metadata?.full_name as string | undefined)
        || (user.user_metadata?.name as string | undefined)
        || user.email
        || ""
    const base = source.split("@")[0].replace(/[^A-Za-z0-9_]/g, "").slice(0, 30)
    return base.length >= 3 ? base : ""
}

type Phase = "loading" | "needs-profile" | "error"

export default function PagesAuthCallbackPage() {
    const navigate = useNavigate()
    const [phase, setPhase] = useState<Phase>("loading")
    const [error, setError] = useState("")
    const [user, setUser] = useState<User | null>(null)

    const [username, setUsername] = useState("")
    const [birthday, setBirthday] = useState("")
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [formMessage, setFormMessage] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const youngestBirthday = yearsAgo(13)
    const oldestBirthday = yearsAgo(120)

    useEffect(() => {
        let cancelled = false

        async function completeSignIn() {
            const params = new URLSearchParams(window.location.search)
            const oauthError = params.get("error_description") || params.get("error")
            if (oauthError) {
                if (!cancelled) {
                    setError(oauthError)
                    setPhase("error")
                }
                return
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (cancelled) return

            if (sessionError || !session) {
                setError(sessionError?.message || "We couldn't complete your sign-in. Please try again.")
                setPhase("error")
                return
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("username, isBusiness")
                .eq("id", session.user.id)
                .maybeSingle()

            if (cancelled) return

            if (profileError) {
                console.error("Unable to load your profile:", profileError.message)
                setError("We couldn't finish setting up your account. Please try again.")
                setPhase("error")
                return
            }

            if (!profile?.username) {
                setUser(session.user)
                setUsername(suggestUsername(session.user))
                setPhase("needs-profile")
                return
            }

            navigate(profile.isBusiness === true ? "/business-home" : "/home", { replace: true })
        }

        completeSignIn()

        return () => {
            cancelled = true
        }
    }, [navigate])

    async function handleCompleteProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormMessage("")

        if (!user) return

        const normalizedUsername = username.trim()

        if (!normalizedUsername || !birthday || !termsAccepted) {
            setFormMessage("Please fill in all fields.")
            return
        }

        if (birthday < oldestBirthday || birthday > youngestBirthday) {
            setFormMessage("You must be at least 13 years old to create an account.")
            return
        }

        if (!/^[A-Za-z0-9_]{3,30}$/.test(normalizedUsername)) {
            setFormMessage("Username must be 3–30 characters and contain only letters, numbers, and underscores.")
            return
        }

        setSubmitting(true)
        try {
            const { data: moderation, error: moderationError } = await supabase.functions.invoke("moderate-username", {
                body: { username: normalizedUsername },
            })

            if (moderationError || moderation?.approved !== true) {
                setFormMessage("That username does not meet the community guidelines. Please choose another one.")
                return
            }

            const { data: usernameAvailable, error: availabilityError } = await supabase.rpc(
                "is_username_available",
                { requested_username: normalizedUsername },
            )

            if (availabilityError) {
                console.error("Unable to check the username:", availabilityError.message)
                setFormMessage("Unable to check that username. Please try again.")
                return
            }

            if (!usernameAvailable) {
                setFormMessage("Username already exists. Please choose a different username.")
                return
            }

            const termsVersion = "2026-07-13"
            const termsAcceptedAt = new Date().toISOString()

            const { error: profileError } = await supabase.rpc("complete_oauth_profile", {
                requested_username: normalizedUsername,
                requested_birthday: birthday,
            })

            if (profileError) {
                setFormMessage(profileError.message)
                return
            }

            await supabase.auth.updateUser({
                data: {
                    username: normalizedUsername,
                    display_name: normalizedUsername,
                    birthday,
                    accepted_terms: true,
                    terms_version: termsVersion,
                    terms_accepted_at: termsAcceptedAt,
                },
            })

            navigate("/home", { replace: true })
        } catch (error) {
            console.error("Unable to finish creating your account:", error)
            setFormMessage("Unable to reach Bloom. Check your connection and try again.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <PageLifecycle {...pageMetadata}>
            <div className="CenterBox">
                {phase === "error" && (
                    <>
                        <h1 style={{ textAlign: "center", marginBottom: 0 }}>Sign-in failed</h1>
                        <p className="auth-intro">{error}</p>
                        <p style={{ fontSize: 15, color: "grey", textAlign: "center" }}>
                            <Link to="/login">Back to log in</Link>
                        </p>
                    </>
                )}

                {phase === "loading" && (
                    <>
                        <div className="loading-spinner callback-spinner" aria-hidden="true" />
                        <h1 style={{ textAlign: "center", marginBottom: 0 }}>Logging In...</h1>
                        <p className="auth-intro">Please wait while we finish signing you in.</p>
                    </>
                )}

                {phase === "needs-profile" && (
                    <>
                        <h1 style={{ textAlign: "center", marginBottom: 0 }}>Welcome To Bloom!</h1>
                        <p style={{ textAlign: "center", marginTop: 4, fontSize: 14, color: "grey" }}>
                            Almost done — finish setting up your account.
                        </p>

                        <form className="auth-form" onSubmit={handleCompleteProfile}>
                            <label htmlFor="callbackUsername">Username</label>
                            <input
                                id="callbackUsername"
                                type="text"
                                placeholder="Username"
                                autoComplete="username"
                                minLength={3}
                                maxLength={30}
                                pattern="[A-Za-z0-9_]+"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                disabled={submitting}
                                required
                            />

                            <label htmlFor="callbackBirthday">Birthday</label>
                            <input
                                id="callbackBirthday"
                                type="date"
                                autoComplete="bday"
                                min={oldestBirthday}
                                max={youngestBirthday}
                                value={birthday}
                                onChange={(event) => setBirthday(event.target.value)}
                                disabled={submitting}
                                required
                            />

                            <label className="terms-consent" htmlFor="callbackTermsAccepted">
                                <input
                                    id="callbackTermsAccepted"
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(event) => setTermsAccepted(event.target.checked)}
                                    disabled={submitting}
                                    required
                                />
                                <span>
                                    I agree to the <Link to="/terms">Terms of Service</Link> and{" "}
                                    <Link to="/privacy">Privacy Policy</Link>.
                                </span>
                            </label>

                            <p className="form-error" role="alert" aria-live="polite">
                                {formMessage}
                            </p>
                            <button type="submit" disabled={submitting}>
                                {submitting ? "Finishing up..." : "Finish signing up"}
                            </button>
                        </form>
                    </>
                )}
            </div>

            {submitting && (
                <div className="loading-overlay active" role="status" aria-live="polite" aria-label="Finishing up">
                    <div className="loading-spinner" />
                </div>
            )}
        </PageLifecycle>
    )
}
