"use client"

import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/mobile/pages/app/activity/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [],
    "pagePath": "/mobile/pages/app/activity/",
    "redirect": "../calendar/index.html",
    "scripts": [],
    "styles": [],
    "title": "Bloom - Calendar"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
            </>
        </PageLifecycle>
    )
}
