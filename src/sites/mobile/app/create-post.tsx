import AppNavigation from "../../../components/AppNavigation"
import PageLifecycle from "../../../components/PageLifecycle"
import PostComposer from "../../../components/posts/PostComposer"

export const pagePath = "/mobile/pages/app/create-post/"

const pageMetadata = {
    "bodyClass": "app-page create-post-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css"
    ],
    "pagePath": "/mobile/pages/app/create-post/",
    "redirect": null,
    "scripts": [
        {
            "source": "../../../js/i18n.js",
            "type": "module"
        },
        {
            "source": "../../../js/create-post.js",
            "type": "module"
        }
    ],
    "styles": [],
    "title": "Bloom - Create Post"
}

export default function MobilePagesAppCreatePostPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <>
    <AppNavigation showSidebar={false} showTopbarActions={false} versionAsSpan />
    <main className="main-layout">
        <section className="sidebar-profile post-editor" aria-labelledby="createPostTitle">
            <PostComposer heading="Create Post" buttonLabel="Publish" contentAsTextarea />
        </section>
    </main>
    
    

            </>
        </PageLifecycle>
    )
}
