import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/auth/confirm/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/mobile/pages/auth/confirm/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Email Confirmed"
}

export default function MobilePagesAuthConfirmPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <div id="Divider">
        <div className="LeftSide">
            <h1 id="Logo">Email Confirmed</h1>
            <p id="Subtitle">Your email has been confirmed.</p>
            <button id="GetStartedButton" onClick={() => { window.location.href = "../login/index.html" }}>Continue To Login</button>
        </div>
        <div className="RightSide">
            <img src="../../../Assets/MainImage.webp" alt="Bloom Image" id="MainImage" />
        </div>
    </div>
    

            </>
        </PageLifecycle>
    )
}
