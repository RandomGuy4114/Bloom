import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAnonKey, supabaseUrl } from "./env"

// Signed-in visitors have no use for the marketing landing pages, so they get
// sent to their feed instead. Both sides carry a trailing slash to match
// `trailingSlash: true` in next.config.ts and save a second redirect hop.
const landingRedirects = new Map([
    ["/", "/home/"],
    ["/mobile/", "/mobile/home/"],
])

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                for (const { name, value } of cookiesToSet) {
                    request.cookies.set(name, value)
                }
                response = NextResponse.next({ request })
                for (const { name, value, options } of cookiesToSet) {
                    response.cookies.set(name, value, options)
                }
            },
        },
    })

    const { data: { user } } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const destination = landingRedirects.get(pathname.endsWith("/") ? pathname : `${pathname}/`)

    if (user && destination) {
        const url = request.nextUrl.clone()
        url.pathname = destination
        const redirect = NextResponse.redirect(url)
        // Carry over any cookies the session refresh above just set; they live
        // on `response`, which is discarded in favour of the redirect.
        for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
        return redirect
    }

    return response
}
