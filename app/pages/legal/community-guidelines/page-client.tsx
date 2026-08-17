"use client"

import PageLifecycle from "@/components/PageLifecycle"
import InfoPageHead from "@/components/InfoPageHead"
import BottomBar from "@/components/BottomBar"

export const pagePath = "/pages/legal/community-guidelines/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/legal/community-guidelines/",
    "redirect": null,
    "scripts": [
        { "source": "../../../js/i18n.js", "type": "module" }
    ],
    "styles": [],
    "title": "Bloom - Community Guidelines"
}

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>

<InfoPageHead title="The Bloom Project™ Community Guidelines" subtitle="Last Updated August 6, 2026"/>

<div className="TOC-Container">
    <h2>Table of Contents</h2>
</div>

<div className="TOC-Container">
    <h2 id="introduction">Introduction</h2>
    <p>Bloom exists to help people connect with their local communities, share ideas, organize events, and make meaningful connections.</p>
    <p>These guidelines explain the kind of community we're trying to create. By using Bloom, you agree to follow these guidelines and help create a positive and inclusive environment for everyone.</p>
</div>

<div className="TOC-Container">
    <h2 id="respect">1. Be Respectful</h2>
    <p>You may disagree with someone, but personal attacks, harassment, bullying, intimidation, or targeted abuse is not acceptable.</p>
</div>

<div className="TOC-Container">
    <h2 id="relevant">2. Keep Content Relevant</h2>
    <p>Keep your posts and interactions relevant to the community and the topics being discussed. Avoid spamming, self-promotion, or posting content that is not related to the community.</p>
</div>

<div className="TOC-Container">
    <h2 id="privacy-respect">3. Respect Privacy</h2>
    <p>Respect the privacy of others. Do not share personal information without consent, and be mindful of the information you share about yourself.</p>
</div>

<div className="TOC-Container">
    <h2 id="illegal">4. Keep It Legal</h2>
    <p>Do not post or share any content that is illegal, harmful, or violates the rights of others.</p>
</div>


<BottomBar />

            </>
        </PageLifecycle>
    )
}