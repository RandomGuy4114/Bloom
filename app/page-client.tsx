"use client"

import { motion } from "motion/react"
import "@/App.css"
import flowerImg from "@/Assets/Flower.png"
import mapImg from "@/Assets/MapImg.png"
import siteShowcaseImg from "@/Assets/SiteShowcase.png"
import BottomBar from "@/components/BottomBar"
import { useRouter } from "next/navigation"
import PageLifecycle from "@/components/PageLifecycle"
import { Analytics } from "@vercel/analytics/next"

const pageMetadata = {
    bodyClass: "landing-page",
    language: "en",
    links: [],
    pagePath: "/pages/landing/",
    redirect: null,
    scripts: [{ source: "../../js/i18n.js", type: "module" }],
    styles: [],
    title: "Bloom",
}


function Landing() {
    const router = useRouter()
    return (
        <PageLifecycle {...pageMetadata}>
            <div className="topbarHome">
                <button type="button" id="loginButton" aria-label="Login" onClick={() => router.push("/login")} data-i18n-ignore="true">Login</button>
                <button type="button" id="registerButton" aria-label="Register" onClick={() => router.push("/register")} data-i18n-ignore="true">Register</button>
                <button type="button" id="languageButton" aria-label="Cambiar idioma" data-i18n-ignore="true">Cambiar idioma</button>
            </div>
            <main>
                <section id="Divider" aria-labelledby="Logo">
                    <div className="LeftSide">
                        <motion.h1 animate={{ scale: [0.1, 1], y: [-20, 0] }} transition={{ease: "circInOut", duration: 1}} id="Logo" style={{ fontSize: "clamp(5rem, 10vw, 15rem)", marginTop: "100px" }}>The Bloom Project™</motion.h1>
                        <motion.p animate={{ opacity: [0, 1], y: [20, 0] }} transition={{ease: "circInOut", duration: 1, delay: 1}} className="landing-attribution" id="LandingSubtitle" style={{ fontSize: "clamp(1rem, 2vw, 1.5rem)", margin: 0, opacity: 0 }}>Making local connections easier</motion.p>

                        <img className="Flower" src={flowerImg.src} alt="A beautiful flower" width="250" height="250" decoding="async"/>
                        <img className="FlowerTop" src={flowerImg.src} alt="A beautiful flower" width="250" height="250" decoding="async"/>
                        <img className="FlowerBg1" src={flowerImg.src} alt="A beautiful flower" width="250" height="250" decoding="async"/>
                        <img className="FlowerBg2" src={flowerImg.src} alt="A beautiful flower" width="250" height="250" decoding="async"/>
                        
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
                            <img className="ImageFrame" src={mapImg.src} alt="A map of the local area" width="100%" height="100%" style={{ objectFit: "cover" }} decoding="async" />
                            <img className="ImageFrame2" src={siteShowcaseImg.src} alt="The Bloom Homepage" width="100%" height="100%" style={{ objectFit: "cover" }} decoding="async" />
                        </div>
                    </div>
                </section>
                <BottomBar />
            </main>
        <Analytics />
        </PageLifecycle>
    )
}

export default Landing
