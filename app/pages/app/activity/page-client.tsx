"use client"

import PageLifecycle from "@/components/PageLifecycle"

export const pagePath = "/pages/app/activity/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [],
    "pagePath": "/pages/app/activity/",
    "redirect": "../calendar/",
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
