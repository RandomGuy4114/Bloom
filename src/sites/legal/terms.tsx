import PageLifecycle from "../../components/PageLifecycle"
import InfoPageHead from "../../components/InfoPageHead"
import BottomBar from "../../components/BottomBar"

export const pagePath = "/pages/legal/terms/"

const pageMetadata = {
    "bodyClass": "",
    "language": "en",
    "links": [
        "../../../css/styles.css"
    ],
    "pagePath": "/pages/legal/terms/",
    "redirect": null,
    "scripts": [
        { "source": "../../../js/i18n.js", "type": "module" }
    ],
    "styles": [],
    "title": "Bloom - Terms of Service"
}

export default function PagesLegalTermsPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <InfoPageHead title="The Bloom Project™ Terms Of Service" subtitle="Last Updated: August 5, 2026"/>
    <div className="TOC-Container">
        <h2>Table of Contents</h2>
        <ol>
            <li><a href="#purpose">Purpose Of Bloom</a></li>
            <li><a href="#eligibility">Eligibility</a></li>
            <li><a href="#account">Your Account</a></li>
            <li><a href="#acceptableUse">Acceptable Use</a></li>
            <li><a href="#comContent">Community Content</a></li>
            <li><a href="#opSource">Open Source</a></li>
            <li><a href="#localCom">Local Communities</a></li>
            <li><a href="#privacy">Privacy</a></li>
            <li><a href="#availability">Availability</a></li>
            <li><a href="#vpns">VPNs and Location Spoofing</a></li>
            <li><a href="#termination">Termination</a></li>
            <li><a href="#changes">Changes to These Terms</a></li>
            <li><a href="#contact">Contact</a></li>
        </ol>
    </div>
    <div className="TOC-Container">
        <h2 id="purpose">1. Purpose</h2>
        <p>Bloom is a community-focused social platform designed to help people connect with local communities, share information, organize events, and help each other.</p>
        <p>Bloom is currently in <strong>Alpha</strong>, which means features may change, break, or be removed.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="eligibility">2. Eligibility</h2>
        <p>You are responsible for ensuring that your use of Bloom complies with the laws of your country.</p>
        <p>If you are under the minimum age required by your local laws to use online services, you must have permission from a parent or legal guardian.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="account">3. Your Account</h2>
        <p>You are responsible for:</p>
        <ul>
            <li>Keeping Your Password Secure.</li>
            <li>Providing accurate information when required.</li>
            <li>Any activity using your account.</li>
        </ul>
        <p>You may not create accounts to impersonate another person or organization</p>
    </div>
    <div className="TOC-Container">
        <h2 id="acceptableUse">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
            <li>Harass, threaten, or bully others.</li>
            <li>Post illegal or fraudulent content.</li>
            <li>Share another person's private information without their permission.</li>
            <li>Upload malware or attempt to disrupt Bloom.</li>
            <li>Spam communities or users.</li>
            <li>Circumvent security features or abuse bugs.</li>
            <li>Use automated systems to overload the service.</li>
            <li>Post Suggestive, explicit, or inappropriate content in any way.</li>
        </ul>
        <p>Bloom may suspend or remove accounts that violate these rules.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="comContent">5. Community Content</h2>
        <p>You retain ownership of the content you create.</p>
        <p>By posting content on Bloom, you grant Bloom a non-exclusive license to display, store, and distribute your content as necessary to operate the service.</p>
        <p>You are responsible for anything you post.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="opSource">6. Open Source</h2>
        <p>Bloom's client and other project components may be released under open-source licenses.</p>
        <p>The open-source nature of Bloom does not give you permission to:</p>
        <ul>
            <li>Access data that is not yours.</li>
            <li>Attack or abuse Bloom's infrastructure.</li>
            <li>Pretend to represent the official Bloom project.</li>
        </ul>
    </div>
    <div className="TOC-Container">
        <h2 id="localCom">7. Local Communities</h2>
        <p>Some communities on Bloom are based on physical locations.</p>
        <p>Location information is used to support location-based features such as discovering or joining nearby communities.</p>
        <p>Bloom does not guarantee the accuracy of user-provided locations or community information.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="privacy">8. Privacy</h2>
        <p>Your use of Bloom is also governed by the <a href="../privacy/">Privacy Policy.</a></p>
        <p>Bloom aims to collect only the information necessary to operate the platform.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="availability">9. Availability</h2>
        <p>Bloom is provided "as is."</p>
        <p>Because Bloom is currently under active development:</p>
        <ul>
            <li>Features may change.</li>
            <li>Downtime may occur.</li>
            <li>Data may occasionally be lost due to bugs or maintenance.</li>
        </ul>
        <p>While reasonable efforts are made to keep the service available, uninterrupted operation is not guaranteed.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="vpns">10. VPNs and Location Spoofing</h2>
        <p>Using a VPN or other means to spoof your location may violate these Terms and result in account suspension or termination.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="termination">11. Termination</h2>
        <p>Bloom may suspend or terminate accounts that violate these Terms or pose a risk to the platform or its users.</p>
        <p>Users may request deletion of their account, subject to applicable legal requirements and technical limitations.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="changes">12. Changes to These Terms</h2>
        <p>These Terms may be updated from time to time.</p>
        <p>Continued use of Bloom after updated Terms become effective constitutes acceptance of the revised Terms.</p>
    </div>
    <div className="TOC-Container">
        <h2 id="contact">13. Contact</h2>
        <p>Questions regarding these Terms may be directed through the official Bloom GitHub repository or other official contact channels.</p>
        <p>Thank you for helping build a stronger local community through Bloom.</p>
    </div>
    <BottomBar />

            </>
        </PageLifecycle>
    )
}
