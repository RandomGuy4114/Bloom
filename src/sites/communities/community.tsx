import AppNavigation from "../../components/AppNavigation";
import PageLifecycle from "../../components/PageLifecycle";
import PostComposer from "../../components/posts/PostComposer";
import SubCommunityList from "../../components/SubCommunityList";

export const pagePath = "/pages/communities/community/";

const pageMetadata = {
  bodyClass: "app-page community-page",
  language: "en",
  links: ["../../../css/styles.css"],
  pagePath: "/pages/communities/community/",
  redirect: null,
  scripts: [
    {
      source: "../../../js/i18n.js",
      type: "module",
    },
    {
      source: "../../../js/community-single.js",
      type: "module",
    },
    {
      source: "../../../js/create-post.js",
      type: "module",
    },
  ],
  styles: [],
  title: "Bloom - Community",
};

export default function PagesCommunitiesCommunityPage() {
  const communityId = new URLSearchParams(window.location.search).get(
    "communityID",
  );

  return (
    <PageLifecycle {...pageMetadata}>
      <>
        <AppNavigation usernameLabel="Communities" />

        <div className="main-layout">
          <div className="feed-container">
            <div className="communities-profile community-hero">
              <div
                id="communityBanner"
                className="community-banner"
                hidden
              />

              <div className="community-header">
                <div
                  id="communityPicture"
                  className="community-picture community-picture--detail"
                />
                <div className="community-header-text">
                  <div className="community-title-row">
                    <h1 id="comName" />
                    <span
                      id="businessCommunityTag"
                      className="business-community-tag"
                      hidden
                    >
                      Business
                    </span>
                  </div>
                  <p id="comMemb" className="community-meta" />
                </div>
                <div className="community-page-actions">
                  <button id="editCommunityButton" type="button" hidden>
                    Edit Community
                  </button>
                  <button id="manageJoinRequestsButton" type="button" hidden>
                    Join Requests
                  </button>
                  <button id="joinCommunityButton" type="button">
                    Join Community
                  </button>
                </div>
              </div>
            </div>

            <div className="community-columns">
              <div className="community-main">
                <div className="feed-updates">
                  <div className="composer-holder">
                      <PostComposer compact />
                  </div>
                  <input
                    type="search"
                    id="searchPostInput"
                    aria-label="Search posts"
                    placeholder="Search posts"
                    style={{ width: "100%", marginBottom: "10px" }}
                  />
                  <div className="posts-container" id="com-posts" />
                </div>
              </div>

              <aside className="community-sidebar">
                <div className="community-sidebar-card">
                  <h3>About</h3>
                  <p id="comDesc" />
                </div>

                <SubCommunityList communityId={communityId} />
              </aside>
            </div>
          </div>
        </div>
      </>
    </PageLifecycle>
  );
}
