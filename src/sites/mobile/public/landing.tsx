import type { CSSProperties } from "react"
import BottomBar from "../../../components/BottomBar"
import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/landing/"

const pageMetadata = {
    "bodyClass": "landing-page",
    "language": "en",
    "links": [
        "../../css/styles.css"
    ],
    "pagePath": "/mobile/pages/landing/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../js/landing.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom"
}

export default function MobilePagesLandingPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <div className="topbarHome">
        <a className="topbarHomeLink" href="../auth/register/index.html">Sign Up</a>
        <a className="topbarHomeLink" href="../auth/login/index.html">Log In</a>
        <button type="button" id="languageButton" aria-label="Cambiar idioma" data-i18n-ignore="true">Cambiar idioma</button>
    </div>
    <main>
        <section id="Divider" aria-labelledby="Logo">
            <div className="LeftSide">
                <h1 id="Logo" style={{ "fontSize": "clamp(5rem, 10vw, 15rem)", "marginTop": "100px" } as CSSProperties}>Bloom</h1>
                <p className="landing-attribution" id="LandingSubtitle" style={{ "fontSize": "clamp(1rem, 2vw, 1.5rem)", "margin": "0", "opacity": "0" } as CSSProperties}>Making local connections easier</p>
                <img className="Flower" src="../../Assets/Flower.png" alt="A beautiful flower" width="250" height="250" decoding="async" fetchPriority="high" />
                <img className="FlowerTop" src="../../Assets/Flower.png" alt="A beautiful flower" width="250" height="250" decoding="async" fetchPriority="high" />
                <img className="FlowerBg1" src="../../Assets/Flower.png" alt="A beautiful flower" width="250" height="250" decoding="async" fetchPriority="high" />
                <img className="FlowerBg2" src="../../Assets/Flower.png" alt="A beautiful flower" width="250" height="250" decoding="async" fetchPriority="high" />
                <div className="BottomSection">
                    <div className="BottomSectionContent">
                        <h2 className="InfoSectionTitle">Why Bloom?</h2>
                        <p className="landing-copy">Bloom is meant to make the process of connecting with your local community easier and more enjoyable.</p>
                    </div>
                    <div className="BottomSectionContent">
                        <h2 className="InfoSectionTitle">Bloom And Open Source</h2>
                        <p className="landing-copy">Bloom is open source, so anyone can contribute. This supports a transparent, community-driven approach to building software.</p>
                    </div>
                    <div className="BottomSectionContent">
                        <h2 className="InfoSectionTitle">Support Bloom</h2>
                        <p className="landing-copy">If you enjoy using Bloom, consider supporting the project. Your contributions help keep Bloom free and open source for everyone.</p>
                    </div>
                    <img className="ImageFrame" src="../../Assets/MapImg.png" alt="A map of the local area" width="100%" height="100%" style={{ "objectFit": "cover" } as CSSProperties} decoding="async" fetchPriority="high" />
                    <img className="ImageFrame2" src="../../Assets/SiteShowcase.png" alt="The Bloom Homepage" width="100%" height="100%" style={{ "objectFit": "cover" } as CSSProperties} decoding="async" fetchPriority="high" />
                </div>
            </div>
        </section>
    </main>

    <BottomBar mobile />

    
    

            </>
        </PageLifecycle>
    )
}
