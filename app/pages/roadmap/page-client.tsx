"use client"

import PageLifecycle from "@/components/PageLifecycle"
import InfoPageHead from "@/components/InfoPageHead"
import BottomBar from "@/components/BottomBar"

export const pagePath = "/pages/roadmap/"

const pageMetadata = {
    "bodyClass": "roadmap-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/roadmap/",
    "redirect": null,
    "scripts": [],
    "styles": [],
    "title": "Bloom - Roadmap"
}

const roadmap = [
    {
        "title": "Alpha Release",
        "date": "2026-07-15 - 2026-08-01",
        "description": "Initial release of Bloom with core features for connecting with local communities.",
        "current": false,
        "alignment": "left"
    },
    {
        "title": "Mobile App Development",
        "date": "2026-08 - 2026-08-15",
        "description": "Self explanatory: Developing a mobile app version of Bloom for iOS and Android platforms.",
        "current": false,
        "alignment": "left"
    },
    {
        "title": "Alpha Feedback Wave",
        "date": "2026-08-15 - 2026-09-01",
        "description": "Gathering user feedback to refine the platform and prioritize new features.",
        "current": true,
        "alignment": "left"
    },
    {
        "title": "Beta Release",
        "date": "2027",
        "description": "Introducing new features, improvements, and bug fixes based on user feedback.",
        "current": false,
        "alignment": "right"
    },
    {
        "title": "Community Expansion",
        "date": "2027",
        "description": "Expanding Bloom's reach to more communities and enhancing user engagement.",
        "current": false,
        "alignment": "right"
    },
    {
        "title": "Beta Feedback Wave",
        "date": "2027",
        "description": "Collecting feedback from beta users to further improve the platform.",
        "current": false,
        "alignment": "right"
    },
    {
        "title": "Public Launch",
        "date": "?",
        "description": "Official public launch of Bloom with a polished user experience and additional features.",
        "current": false,
        "alignment": "left"
    },
]

export default function PageClient() {
    return (
        <PageLifecycle {...pageMetadata}>
            <InfoPageHead 
                title="Bloom Roadmap"
                subtitle="A look at what we're working on and what's coming next."
            />
            <main className="roadmap" aria-label="Bloom development timeline">
                <div className="roadmap-line" aria-hidden="true"></div>
                {roadmap.map((item, index) => (
                    <div className="milestone" key={index}>
                        <div className="dot" data-current={item.current} aria-hidden="true"></div>
                        <div className={`milestone-content ${item.alignment === 'right' ? 'right' : 'left'}`}>
                            <h3 className="milestone-title">{item.title} </h3>
                            <p className="milestone-date">{item.date}</p>
                            <p className="milestone-description">{item.description}</p>
                        </div>
                    </div>
                ))}
            </main>
            <BottomBar />
        </PageLifecycle>
    )
}
