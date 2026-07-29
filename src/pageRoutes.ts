import type { ComponentType } from "react"

interface PageModule {
    default: ComponentType
    pagePath: string
}

interface PageComponentDefinition {
    Component: ComponentType
    pagePath: string
}

export interface PageRouteDefinition extends PageComponentDefinition {
    path: string
}

const pageModules = import.meta.glob("./sites/**/*.tsx", {
    eager: true,
}) as Record<string, Partial<PageModule>>

function normalizedPath(path: string) {
    const withoutIndex = path.replace(/\/index\.html$/i, "/")
    const withLeadingSlash = withoutIndex.startsWith("/") ? withoutIndex : `/${withoutIndex}`
    return withLeadingSlash !== "/" ? withLeadingSlash.replace(/\/+$/, "/") : "/"
}

const routeMap = new Map<string, PageComponentDefinition>()

for (const pageModule of Object.values(pageModules)) {
    if (!pageModule.pagePath || !pageModule.default) continue
    const pagePath = normalizedPath(pageModule.pagePath)
    const definition = { Component: pageModule.default, pagePath }
    routeMap.set(pagePath, definition)
    routeMap.set(pagePath.replace(/\/$/, ""), definition)
    routeMap.set(pagePath.replace(/\/$/, "/index.html"), definition)
}

const aliases: Record<string, string> = {
    "/activity": "/pages/app/activity/",
    "/business": "/pages/business/",
    "/business-dashboard": "/pages/business/dashboard/",
    "/business-home": "/pages/business/home/",
    "/business-profile": "/pages/business/profile/",
    "/business-register": "/pages/auth/business/",
    "/business-settings": "/pages/business/settings/",
    "/calendar": "/pages/app/calendar/",
    "/communities": "/pages/communities/communities/",
    "/community": "/pages/communities/community/",
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

export const siteRoutes: PageRouteDefinition[] = [...routeMap.entries()].map(([path, definition]) => ({
    ...definition,
    path,
}))
