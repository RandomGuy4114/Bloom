import AppNavigation from "../../components/AppNavigation"
import PageLifecycle from "../../components/PageLifecycle"

export const pagePath = "/pages/app/supporter/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/app/supporter/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/supporter.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Supporter"
}

export default function PagesAppSupporterPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation />
    <main className="main-layout">
        <section className="settings-container supporter-container">
            <h1>Buy Bloom Supporter</h1>
            <p>Support Bloom on Patreon, then connect your Patreon account to unlock Supporter features.</p>
            <section className="supporter-features" aria-labelledby="supporterFeaturesTitle">
                <h2 id="supporterFeaturesTitle">Supporter Features</h2>
                <div className="supporter-features-grid">
                    <article className="supporter-feature"><h3>Supporter Badge</h3><p>Display a Supporter badge on your profile, posts, and community member listings.</p></article>
                    <article className="supporter-feature"><h3>Longer Bios</h3><p>Use up to 1,500 characters in your profile bio instead of 500.</p></article>
                    <article className="supporter-feature"><h3>Animated Profile Pictures</h3><p>Use animated GIF profile pictures and upload profile images up to 15 MB.</p></article>
                    <article className="supporter-feature"><h3>More Post Images</h3><p>Add up to five images per post, with a 25 MB limit for each image.</p></article>
                    <article className="supporter-feature"><h3>Larger Community Areas</h3><p>Create communities with radiuses up to 40 kilometers.</p></article>
                    <article className="supporter-feature"><h3>Community Banners</h3><p>Upload and replace banners for communities you own.</p></article>
                    <article className="supporter-feature"><h3>Exclusive Themes</h3><p>Unlock the Forest, Midnight, and Sunset themes.</p></article>
                    <article className="supporter-feature"><h3>Early Access</h3><p>Preview eligible experimental Bloom features before release.</p></article>
                </div>
            </section>
            <p id="supporterStatus" role="status" aria-live="polite">Connect Patreon to verify your Supporter membership.</p>
            <button type="button" id="connectPatreonButton">Connect Patreon</button>
        </section>
    </main>

    
    

            </>
        </PageLifecycle>
    )
}
