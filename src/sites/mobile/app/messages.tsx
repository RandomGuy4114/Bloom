import AppNavigation from "../../../components/AppNavigation"
import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/app/messages/"

const pageMetadata = {
    "bodyClass": "app-page messages-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/messages/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/messages.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Direct Messages"
}

export default function MobilePagesAppMessagesPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation sidebarAsAside versionAsSpan />
    <main className="main-layout" aria-label="Direct Messages">
        <section className="messages-container">
            <div className="contacts-container" id="contactsContainer">
                <h3>Contacts</h3>
                <div id="contactsList" className="contacts-list" aria-live="polite"></div>
            </div>
            <div className="chat-container" id="chatContainer">
                <h3 id="chatHeader">Select a contact to start chatting</h3>
                <div id="chatMessages" className="chat-messages" aria-live="polite"></div>
                <div className="chat-input-container">
                    <input className="message-image-input" id="messageImageInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Attach an image" />
                    <input type="text" id="chatInput" placeholder="Type a message..." aria-label="Type a message" />
                    <button className="message-image-button" id="messageImageButton" type="button" aria-label="Attach an image" title="Attach an image">
                        <i className="ri-attachment-2" aria-hidden="true"></i>
                    </button>
                    <button id="sendButton" className="send-button" type="button" aria-label="Send message">Send</button>
                </div>
            </div>
        </section>
    </main>
    
    

            </>
        </PageLifecycle>
    )
}
