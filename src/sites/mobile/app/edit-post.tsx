import AppNavigation from "../../../components/AppNavigation"
import PageLifecycle from "../../../components/PageLifecycle"

export const pagePath = "/mobile/pages/app/edit-post/"

const pageMetadata = {
    "bodyClass": "app-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/edit-post/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/edit-post.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Edit Post"
}

export default function MobilePagesAppEditPostPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation mobile />
    <main className="main-layout">
        <div className="feed-container">
            <form id="editPostForm" className="post post-editor">
                <h1>Edit Post</h1>
                <label htmlFor="editPostTitle">Post title</label>
                <input id="editPostTitle" type="text" minLength={1} maxLength={200} required />
                <label htmlFor="editPostBody">Post content</label>
                <textarea id="editPostBody" minLength={1} maxLength={10000} required></textarea>
                <p id="editPostError" className="form-error" role="alert" aria-live="polite"></p>
                <div className="popup-actions">
                    <button id="cancelEditPost" type="button" className="secondary-action">Cancel</button>
                    <button type="submit">Save changes</button>
                </div>
            </form>
        </div>
    </main>
    
    

            </>
        </PageLifecycle>
    )
}
