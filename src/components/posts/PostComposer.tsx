import { useState } from "react"

interface PostComposerProps {
    buttonLabel?: string
    compact?: boolean
    contentAsTextarea?: boolean
    heading?: string
}

export default function PostComposer({
    buttonLabel = "Post",
    compact = false,
    contentAsTextarea = false,
    heading,
}: PostComposerProps) {
    const ContentInput = contentAsTextarea ? "textarea" : "input"
    const [expanded, setExpanded] = useState(!compact)

    return (
        <div
            className={`post-composer ${expanded ? "is-expanded" : "is-collapsed"}`}
            onClick={compact && !expanded ? () => setExpanded(true) : undefined}
        >
            {heading && <h1 id="createPostTitle">{heading}</h1>}
            <div className="post-composer-header">
                <div className="pfp-frame"></div>
                <select id="communitySelect" className="composer-select" aria-label="Community"></select>
            </div>
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
                placeholder={expanded ? "Write your post" : "How's your day going?"}
                maxLength={10000}
            />
            <input type="file" id="postImageInput" className="post-image-input" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Add images" multiple />
            <div id="postImagePreview" className="post-image-preview" hidden></div>
            <div className="post-composer-actions">
                <div className="post-composer-attach">
                    <button type="button" id="postImageButton" className="post-image-picker" aria-label="Add images" title="Add images"><i className="ri-attachment-2" aria-hidden="true"></i></button>
                    <p id="postImageLimitHint" className="composer-help"></p>
                </div>
                <div className="post-composer-buttons">
                    {compact && expanded && (
                        <button type="button" className="post-composer-cancel" onClick={() => setExpanded(false)}>Cancel</button>
                    )}
                    <button type="button" id="createPostButton">{buttonLabel}</button>
                </div>
            </div>
        </div>
    )
}
