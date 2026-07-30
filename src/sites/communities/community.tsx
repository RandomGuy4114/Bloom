import type { CSSProperties } from "react";

import AppNavigation from "../../components/AppNavigation";
import PageLifecycle from "../../components/PageLifecycle";
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

        <div className="rightBar">
          <h2 className="community-members-title">Community Members</h2>
          <div
            id="communityMembersContainer"
            className="community-members-list"
          />
        </div>

        <div className="main-layout">
          <div className="feed-container">
            <div
              className="communities-profile"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
              } as CSSProperties}
            >
              <div
                id="communityBanner"
                className="community-banner"
                hidden
              />
              <div
                id="communityPicture"
                className="community-picture community-picture--detail"
              />
              <h1 id="comName" style={{ textAlign: "center" }} />
              <span
                id="businessCommunityTag"
                className="business-community-tag"
                hidden
              >
                Business
              </span>
              <p
                id="comDesc"
                style={{ textAlign: "center", color: "grey" }}
              />

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

            <SubCommunityList communityId={communityId} />

            <div className="feed-updates">
              <input
                type="search"
                id="searchPostInput"
                aria-label="Search posts"
                placeholder="Search posts"
                style={{ width: "90%", marginBottom: "10px" }}
              />
              <div className="posts-container" id="com-posts" />
            </div>
          </div>
        </div>
      </>
    </PageLifecycle>
  );
}
