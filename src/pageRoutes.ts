import { lazy, type ComponentType, type LazyExoticComponent } from "react"

interface PageModule {
    default: ComponentType
}

interface PageComponentDefinition {
    Component: LazyExoticComponent<ComponentType>
    pagePath: string
    preload: () => Promise<PageModule>
}

export interface PageRouteDefinition extends PageComponentDefinition {
    path: string
}

const pageModules = import.meta.glob([
    "./sites/**/*.tsx",
    "!./sites/public/landing.tsx",
    "!./sites/auth/login.tsx",
    "!./sites/auth/register.tsx",
]) as Record<
    string,
    () => Promise<PageModule>
>

function normalizedPath(path: string) {
    const withoutIndex = path.replace(/\/index\.html$/i, "/")
    const withLeadingSlash = withoutIndex.startsWith("/") ? withoutIndex : `/${withoutIndex}`
    return withLeadingSlash !== "/" ? withLeadingSlash.replace(/\/+$/, "/") : "/"
}

function modulePagePath(modulePath: string) {
    const relativePath = modulePath
        .replace(/^\.\/sites\//, "")
        .replace(/\.tsx$/, "")

    if (relativePath === "mobile/public/index") return "/mobile/"
    if (relativePath.startsWith("mobile/public/")) {
        return `/mobile/pages/${relativePath.replace("mobile/public/", "").replace("legacy-", "")}/`
    }
    if (relativePath.startsWith("mobile/")) {
        return `/mobile/pages/${relativePath.replace("mobile/", "").replace(/\/index$/, "")}/`
    }
    if (relativePath.startsWith("public/")) {
        return `/pages/${relativePath.replace("public/", "").replace("legacy-", "")}/`
    }
    return `/pages/${relativePath.replace(/\/index$/, "")}/`
}

const routeMap = new Map<string, PageComponentDefinition>()

for (const [modulePath, preload] of Object.entries(pageModules)) {
    const pagePath = normalizedPath(modulePagePath(modulePath))
    const definition = {
        Component: lazy(preload),
        pagePath,
        preload,
    }
    routeMap.set(pagePath, definition)
    routeMap.set(pagePath.replace(/\/$/, ""), definition)
    routeMap.set(pagePath.replace(/\/$/, "/index.html"), definition)
}

const aliases: Record<string, string> = {
    "/activity": "/pages/app/activity/",
    "/blog": "/pages/blog/",
    "/business": "/pages/business/",
    "/business-dashboard": "/pages/business/dashboard/",
    "/business-home": "/pages/business/home/",
    "/business-profile": "/pages/business/profile/",
    "/business-register": "/pages/auth/business/",
    "/business-settings": "/pages/business/settings/",
    "/calendar": "/pages/app/calendar/",
    "/communities": "/pages/communities/communities/",
    "/community": "/pages/communities/community/",
    "/sub-community": "/pages/communities/sub-community/",
    "/confirm": "/pages/auth/confirm/",
    "/connect": "/pages/app/connect/",
    "/create-post": "/pages/app/create-post/",
    "/credits": "/pages/credits/",
    "/early-access": "/pages/app/early-access/",
    "/edit-post": "/pages/app/edit-post/",
    "/home": "/pages/app/home/",
    "/map": "/pages/app/map/",
    "/landing": "/pages/landing/",
    "/messages": "/pages/app/messages/",
    "/post": "/pages/app/post/",
    "/privacy": "/pages/legal/privacy/",
    "/profile": "/pages/app/profile/",
    "/reset-password": "/pages/auth/reset-password/",
    "/roadmap": "/pages/roadmap/",
    "/settings": "/pages/app/settings/",
    "/supporter": "/pages/app/supporter/",
    "/terms": "/pages/legal/terms/",
    "/mobile": "/mobile/",
    "/mobile/activity": "/mobile/pages/app/activity/",
    "/mobile/business": "/mobile/pages/business/",
    "/mobile/business-dashboard": "/mobile/pages/business/dashboard/",
    "/mobile/business-home": "/mobile/pages/business/home/",
    "/mobile/business-profile": "/mobile/pages/business/profile/",
    "/mobile/business-register": "/mobile/pages/auth/business/",
    "/mobile/business-settings": "/mobile/pages/business/settings/",
    "/mobile/calendar": "/mobile/pages/app/calendar/",
    "/mobile/communities": "/mobile/pages/communities/communities/",
    "/mobile/community": "/mobile/pages/communities/community/",
    "/mobile/sub-community": "/mobile/pages/communities/sub-community/",
    "/mobile/confirm": "/mobile/pages/auth/confirm/",
    "/mobile/connect": "/mobile/pages/app/connect/",
    "/mobile/create-post": "/mobile/pages/app/create-post/",
    "/mobile/credits": "/mobile/pages/credits/",
    "/mobile/early-access": "/mobile/pages/app/early-access/",
    "/mobile/edit-post": "/mobile/pages/app/edit-post/",
    "/mobile/home": "/mobile/pages/app/home/",
    "/mobile/landing": "/mobile/pages/landing/",
    "/mobile/login": "/mobile/pages/auth/login/",
    "/mobile/map": "/mobile/pages/app/map/",
    "/mobile/messages": "/mobile/pages/app/messages/",
    "/mobile/post": "/mobile/pages/app/post/",
    "/mobile/privacy": "/mobile/pages/legal/privacy/",
    "/mobile/profile": "/mobile/pages/app/profile/",
    "/mobile/register": "/mobile/pages/auth/register/",
    "/mobile/reset-password": "/mobile/pages/auth/reset-password/",
    "/mobile/settings": "/mobile/pages/app/settings/",
    "/mobile/supporter": "/mobile/pages/app/supporter/",
    "/mobile/terms": "/mobile/pages/legal/terms/",
}

for (const [alias, target] of Object.entries(aliases)) {
    const definition = routeMap.get(target)
    if (definition) routeMap.set(alias, definition)
}

export function prefetchRoute(path: string) {
    const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path
    return routeMap.get(normalized)?.preload()
}

export const siteRoutes: PageRouteDefinition[] = [...routeMap.entries()].map(
    ([path, definition]) => ({
        ...definition,
        path,
    }),
)
