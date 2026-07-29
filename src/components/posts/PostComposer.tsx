interface PostComposerProps {
    buttonLabel?: string
    contentAsTextarea?: boolean
    heading?: string
}

export default function PostComposer({
    buttonLabel = "Post",
    contentAsTextarea = false,
    heading,
}: PostComposerProps) {
    const ContentInput = contentAsTextarea ? "textarea" : "input"

    return (
        <>
            {heading && <h1 id="createPostTitle">{heading}</h1>}
            <select id="communitySelect" className="composer-select" aria-label="Community"></select>
            <div className="post-type-selector" role="radiogroup" aria-label="Post type">
                <button type="button" className="post-type-option is-selected" data-post-type="post" data-i18n-key="postType.post" data-i18n-ignore="true" aria-pressed="true">Post</button>
                <button type="button" className="post-type-option" data-post-type="activity" data-i18n-key="postType.activity" data-i18n-ignore="true" aria-pressed="false">Activity</button>
            </div>
            <input type="text" className="TypeInput" id="titleInput" aria-label="Post title" placeholder="Post title" maxLength={200} />
            <ContentInput
                className="TypeInput"
                id="postInput"
                type={contentAsTextarea ? undefined : "text"}
                aria-label="Post content"
                placeholder="Write your post"
                maxLength={10000}
            />
            <input type="file" id="postImageInput" className="post-image-input" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Add images" multiple />
            <p id="postImageLimitHint" className="composer-help"></p>
            <div id="postImagePreview" className="post-image-preview" hidden></div>
            <div className="post-composer-actions">
                <button type="button" id="postImageButton" className="post-image-picker" aria-label="Add images" title="Add images"><i className="ri-attachment-2" aria-hidden="true"></i></button>
                <button type="button" id="createPostButton">{buttonLabel}</button>
            </div>
        </>
    )
}
