"use client"

import PageLifecycle from "@/components/PageLifecycle"
import { useRouter } from "next/navigation"

export const pagePath = "/mobile/pages/business/"

const pageMetadata = {
    "bodyClass": "landing-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/mobile/pages/business/",
    "redirect": null,
    "scripts": [],
    "styles": [],
    "title": "Bloom - Business"
}

export default function PageClient() {
    const router = useRouter()
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <main>
        <section id="Divider" aria-labelledby="Logo">
                <div className="LeftSide">
                    <h1 id="Logo">Bloom For Business</h1>
                    <p id="Subtitle">Connect your business to Bloom.</p>
                    <button type="button" id="GetStartedButton" onClick={() => router.push("/mobile/business-register")}>Get Started</button>
                    <p className="landing-attribution">An open-source project by FormalBlaze</p>
                </div>
                <div className="RightSide">
                    <img src="../../../Assets/BusinessImage.webp" alt="People connecting through their local community" id="MainImage" width="1400" height="933" decoding="async" fetchPriority="high" />
                </div>    
        </section>
    </main>

            </>
        </PageLifecycle>
    )
}
