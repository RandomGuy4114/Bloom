import type { CSSProperties } from "react"
import PageLifecycle from "../../components/PageLifecycle"
import InfoPageHead from "../../components/InfoPageHead"
import BottomBar from "../../components/BottomBar"



export const pagePath = "/pages/credits/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
    ],
    "pagePath": "/pages/credits/",
    "redirect": null,
    "scripts": [],
    "styles": [],
    "title": "Bloom - Credits"
}

export default function PagesCreditsPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <InfoPageHead 
        title="Credits" 
        subtitle="Acknowledging the individuals and organizations that contributed to the development of Bloom." 
    />
    <div className="TOC-Container">
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>Liam Macgregor / FormalBlaze</h3>
                <p>Lead <span className="RainbowText">
                    <span style={{ "--i": "1" } as CSSProperties}>D</span>
                    <span style={{ "--i": "2" } as CSSProperties}>e</span>
                    <span style={{ "--i": "3" } as CSSProperties}>v</span>
                    <span style={{ "--i": "4" } as CSSProperties}>e</span>
                    <span style={{ "--i": "5" } as CSSProperties}>l</span>
                    <span style={{ "--i": "6" } as CSSProperties}>o</span>
                    <span style={{ "--i": "7" } as CSSProperties}>p</span>
                    <span style={{ "--i": "8" } as CSSProperties}>e</span>
                    <span style={{ "--i": "9" } as CSSProperties}>r</span>
                </span>
                And<span className="RainbowText">
                    <span style={{ "--i": "10" } as CSSProperties}>D</span>
                    <span style={{ "--i": "11" } as CSSProperties}>e</span>
                    <span style={{ "--i": "12" } as CSSProperties}>s</span>
                    <span style={{ "--i": "13" } as CSSProperties}>i</span>
                    <span style={{ "--i": "14" } as CSSProperties}>g</span>
                    <span style={{ "--i": "15" } as CSSProperties}>n</span>
                    <span style={{ "--i": "16" } as CSSProperties}>e</span>
                    <span style={{ "--i": "17" } as CSSProperties}>r</span>
                </span>
            </p></div>
            <p className="CreditMessage">I cant believe I went from making a <a href="">calculator</a> to a social platform. I hope this project ends up being a success!</p>
        </div>
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>Martin Callizo</h3>
                <p>Marketing</p>
            </div>
            <p className="CreditMessage">Martin is one of my close friends, and he one day decided to help with the marketing efforts for Bloom.</p>
        </div>
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>Juan Jose</h3>
                <p>Doing absolutely nothing</p>
            </div>
            <p>I coded this</p>
            <p>Developer Note: He did nothing.</p>
        </div>
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>Roy Ronza</h3>
                <p>Helping In General</p>
            </div>
            <p className="CreditMessage">Roy is probably one of my best friends, and he has been a huge support throughout the development of Bloom.</p>
        </div>
        <h2 style={{ "marginTop": "10px" } as CSSProperties}>Services</h2>
        <p>We would like to acknowledge the following services for their contributions to the development of Bloom:</p>
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>Remix Icon</h3>
                <p>Icons</p>
            </div>
            <p className="CreditMessage">Remix Icon is a simple and beautiful icon library that provides a wide range of icons for web development. We used Remix Icon to add icons to our user interface.</p>
        </div>
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>Supabase</h3>
                <p>Backend</p>
            </div>
            <p className="CreditMessage">Supabase is an open-source Firebase alternative that provides a real-time database and authentication service. We used Supabase to handle our backend logic and user authentication.</p>
        </div>
        <div className="creditElement">
            <div className="creditElementInner">
                <h3>GitHub</h3>
                <p>Hosting</p>
            </div>
            <p className="CreditMessage">GitHub is a web-based hosting service for version control and collaboration. We used GitHub to host our source code and manage our development workflow.</p>
        </div>
        <h2 style={{ "marginTop": "10px" } as CSSProperties}>Special Thanks</h2>
        <p>We would like to extend our special thanks to the following individuals and organizations for their support and contributions to the development of Bloom:</p>
        <div className="creditElement">
            <h3>My Parents</h3>
            <p className="CreditMessage">For their support and encouragement. Always helping me out on this project and providing a safe space to experiment.</p>
        </div>
        <div className="creditElement">
            <h3>My Friends</h3>
            <p className="CreditMessage">For their company and support throughout the development of Bloom and even before it started. I couldn't have done it without them.</p>
        </div>
        <div className="creditElement">
            <h3>You! (The User!)</h3>
            <p className="CreditMessage">Thank you for using bloom! You are the reason why the platform is still going strong. Never stop exploring!</p>
        </div>
        <p style={{ "textAlign": "center", "fontStyle": "italic", "color": "#666" } as CSSProperties}>Special thanks to everyone who has donated to the project.</p>
    </div>
    <BottomBar />
            </>
        </PageLifecycle>
    )
}
