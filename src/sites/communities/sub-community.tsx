import AppNavigation from "../../components/AppNavigation";
import PageLifecycle from "../../components/PageLifecycle";
import PostFeed from "../../components/posts/PostFeed";

export const pagePath = "/pages/communities/sub-community/";

interface InitialSubcommunity {
  title: string | null;
  description: string | null;
}

const pageMetadata = {
  bodyClass: "app-page community-page sub-community-page",
  language: "en",
  links: ["../../../css/styles.css"],
  pagePath,
  redirect: null,
  scripts: [
    { source: "../../../js/i18n.js", type: "module" },
    { source: "../../../js/sub-community.js", type: "module" },
  ],
  styles: [],
  title: "Bloom - Sub-Community",
};

export default function SubCommunityPage({
  initialSubcommunity = null,
}: { initialSubcommunity?: InitialSubcommunity | null }) {
  return (
    <PageLifecycle {...pageMetadata}>
      <AppNavigation usernameLabel="Sub-Community" />

      <aside className="rightBar">
        <h2 className="community-members-title">Members</h2>
        <div id="subcommunityMembers" className="community-members-list" />
      </aside>

      <main className="main-layout">
        <div className="feed-container">
          <section className="communities-profile sub-community-profile">
            <div id="subcommunityInitial" className="sub-community-picture" />
            <h1 id="subcommunityName">{initialSubcommunity?.title || "Loading..."}</h1>
            <p id="subcommunityDescription">{initialSubcommunity?.description || "Loading..."}</p>
            <p id="subcommunityParent" className="post-community-name" />
            <div className="community-page-actions">
              <button id="joinSubcommunityButton" type="button" hidden>
                Join Sub-Community
              </button>
              <button id="editSubcommunityButton" type="button" hidden>
                Edit
              </button>
              <button id="deleteSubcommunityButton" type="button" hidden>
                Delete
              </button>
            </div>
          </section>

          <div id="subcommunityEditor" className="popup-overlay" aria-hidden="true">
            <section className="popup-card" role="dialog" aria-modal="true" aria-labelledby="editSubcommunityTitle">
              <header className="popup-header">
                <h2 id="editSubcommunityTitle">Edit Sub-Community</h2>
                <button id="closeSubcommunityEditButton" className="popup-close" type="button" aria-label="Close dialog">×</button>
              </header>
              <div className="popup-body sub-community-form">
                <label>
                  Name
                  <input id="editSubcommunityName" maxLength={100} />
                </label>
                <label>
                  Description
                  <textarea id="editSubcommunityDescription" maxLength={1000} />
                </label>
                <div className="sub-community-actions">
                  <button id="saveSubcommunityButton" type="button">Save</button>
                  <button id="cancelSubcommunityEditButton" type="button">Cancel</button>
                </div>
              </div>
            </section>
          </div>

          <section className="feed-updates">
            <input
              id="searchSubcommunityPosts"
              type="search"
              placeholder="Search posts"
              aria-label="Search sub-community posts"
            />
            <PostFeed
              id="subcommunityPosts"
              emptyMessage="No posts yet in this sub-community."
            />
          </section>
        </div>
      </main>
    </PageLifecycle>
  );
}
