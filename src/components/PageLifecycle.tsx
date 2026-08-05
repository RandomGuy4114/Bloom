import { type ReactNode, useLayoutEffect } from "react"
import { LEGACY_BUILD_VERSION } from "../generated/legacyBuildVersion"

interface PageScript {
    source: string
    type: string
}

interface PageLifecycleProps {
    bodyClass: string
    children: ReactNode
    language: string
    links: string[]
    pagePath: string
    redirect: string | null
    scripts: PageScript[]
    styles: string[]
    title: string
}

function resolvePageUrl(value: string, pagePath: string) {
    return new URL(value, new URL(pagePath, window.location.origin)).href
}

export default function PageLifecycle({
    bodyClass,
    children,
    language,
    links,
    pagePath,
    redirect,
    scripts,
    styles,
    title,
}: PageLifecycleProps) {
    useLayoutEffect(() => {
        const previousBodyClass = document.body.className
        const previousLanguage = document.documentElement.lang
        const previousTitle = document.title
        const injectedElements: HTMLElement[] = []
        let cancelled = false

        document.body.className = bodyClass
        document.documentElement.lang = language
        document.title = title

        const base = document.createElement("base")
        base.href = pagePath
        base.dataset.reactPage = pagePath
        document.head.prepend(base)
        injectedElements.push(base)

        for (const cssText of styles) {
            const style = document.createElement("style")
            style.dataset.reactPage = pagePath
            style.textContent = cssText
            document.head.append(style)
            injectedElements.push(style)
        }

        for (const href of links) {
            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = resolvePageUrl(href, pagePath)
            link.dataset.reactPage = pagePath
            document.head.append(link)
            injectedElements.push(link)
        }

        async function loadScripts() {
            for (const definition of scripts) {
                if (cancelled) return

                const script = document.createElement("script")
                const sourceUrl = new URL(resolvePageUrl(definition.source, pagePath))
                const isPersistentSharedModule = sourceUrl.pathname.endsWith("/js/i18n.js")
                if (sourceUrl.origin === window.location.origin) {
                    if (isPersistentSharedModule) {
                        // Loaded as a nested import by nearly every other legacy
                        // script too — must resolve to the exact same URL as
                        // those imports (which get "?v=<LEGACY_BUILD_VERSION>"
                        // appended by scripts/sync-legacy.mjs) so it stays a
                        // single shared module instance within a session,
                        // instead of a fresh, state-resetting one per navigation.
                        sourceUrl.searchParams.set("v", LEGACY_BUILD_VERSION)
                    } else {
                        sourceUrl.searchParams.set("reactPage", String(Date.now()))
                    }
                }

                script.src = sourceUrl.href
                script.type = definition.type
                script.dataset.reactPage = pagePath
                script.async = false
                injectedElements.push(script)

                await new Promise<void>((resolve) => {
                    script.addEventListener("load", () => resolve(), { once: true })
                    script.addEventListener("error", () => {
                        console.error(`Unable to load page module: ${script.src}`)
                        resolve()
                    }, { once: true })
                    document.body.append(script)
                })
            }
        }

        if (redirect) window.location.replace(resolvePageUrl(redirect, pagePath))
        else void loadScripts()

        return () => {
            cancelled = true
            for (const element of injectedElements) element.remove()
            document.body.className = previousBodyClass
            document.documentElement.lang = previousLanguage
            document.title = previousTitle
        }
    }, [bodyClass, language, links, pagePath, redirect, scripts, styles, title])

    return <>{children}</>
}
