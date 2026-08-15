import { supabase } from "./supabase.js?v=msuu9c6w";
import {
  getCurrentUserOrRedirect,
  getPostImageUrls,
  getUserProfile,
  isTrustedImageUrl,
  PAGE_URLS,
  reportPost,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js?v=msuu9c6w";
import { t } from "./i18n.js?v=msuu9c6w";

const subcommunityId = new URLSearchParams(window.location.search).get("subcommunityID");
const usernameLabel = document.getElementById("username-label");
const nameElement = document.getElementById("subcommunityName");
const descriptionElement = document.getElementById("subcommunityDescription");
const parentElement = document.getElementById("subcommunityParent");
const initialElement = document.getElementById("subcommunityInitial");
const membersElement = document.getElementById("subcommunityMembers");
const joinButton = document.getElementById("joinSubcommunityButton");
const editButton = document.getElementById("editSubcommunityButton");
const deleteButton = document.getElementById("deleteSubcommunityButton");
const editor = document.getElementById("subcommunityEditor");
const closeEditorButton = document.getElementById("closeSubcommunityEditButton");
const editName = document.getElementById("editSubcommunityName");
const editDescription = document.getElementById("editSubcommunityDescription");
const saveButton = document.getElementById("saveSubcommunityButton");
const cancelButton = document.getElementById("cancelSubcommunityEditButton");
const searchInput = document.getElementById("searchSubcommunityPosts");
const postsHost = document.getElementById("subcommunityPosts");

let currentUser;
let subcommunity;
let parentCommunity;
let posts = [];
let canManage = false;

function subcommunityPageUrl(id) {
  const mobile = window.location.pathname.startsWith("/mobile/");
  const root = mobile
    ? "/mobile/pages/communities/sub-community/"
    : "/pages/communities/sub-community/";
  return `${root}?subcommunityID=${encodeURIComponent(id)}`;
}

function parentPageUrl(id) {
  const mobile = window.location.pathname.startsWith("/mobile/");
  const root = mobile
    ? "/mobile/pages/communities/community/"
    : "/pages/communities/community/";
  return `${root}?communityID=${encodeURIComponent(id)}`;
}

function renderIdentity() {
  nameElement.textContent = subcommunity.title;
  descriptionElement.textContent = subcommunity.description || "";
  initialElement.textContent = subcommunity.title?.trim().charAt(0).toUpperCase() || "B";
  parentElement.replaceChildren();
  const parentLink = document.createElement("a");
  parentLink.href = parentPageUrl(parentCommunity.id);
  parentLink.textContent = t("Part of {name}", { name: parentCommunity.name });
  parentElement.appendChild(parentLink);

  const isMember = subcommunity.members?.includes(currentUser.id) === true;
  joinButton.hidden = isMember;
  editButton.hidden = !canManage;
  deleteButton.hidden = !canManage;
}

async function renderMembers() {
  if (!membersElement) return;
  const memberIds = [...new Set(subcommunity.members ?? [])];
  const profiles = await Promise.all(
    memberIds.map(async (id) => [id, await getUserProfile(id)]),
  );
  membersElement.replaceChildren(
    ...profiles.flatMap(([id, profile]) => {
      if (!profile) return [];
      const link = document.createElement("a");
      link.className = "community-member";
      link.href = `${PAGE_URLS.profile}?uid=${encodeURIComponent(id)}`;
      const avatar = document.createElement("span");
      avatar.className = "pfp-frame community-member-avatar";
      if (isTrustedImageUrl(profile.avatar_url, "Profile Pictures", true)) {
        const image = document.createElement("img");
        image.src = profile.avatar_url;
        image.alt = "";
        avatar.appendChild(image);
      }
      const label = document.createElement("span");
      label.textContent = profile.display_name || profile.username || "Bloom user";
      link.append(avatar, label);
      return [link];
    }),
  );
}

async function loadEngagement(postIds) {
  const likeCounts = new Map();
  const replyCounts = new Map();
  const viewerLikes = new Set();
  if (!postIds.length) return { likeCounts, replyCounts, viewerLikes };
  const [{ data: likes }, { data: replies }] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("post_replies").select("post_id").in("post_id", postIds),
  ]);
  (likes ?? []).forEach((like) => {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);
    if (like.user_id === currentUser.id) viewerLikes.add(like.post_id);
  });
  (replies ?? []).forEach((reply) =>
    replyCounts.set(reply.post_id, (replyCounts.get(reply.post_id) ?? 0) + 1)
  );
  return { likeCounts, replyCounts, viewerLikes };
}

async function renderPosts() {
  const query = searchInput.value.trim().toLowerCase();
  const visiblePosts = posts.filter((post) =>
    `${post.title ?? ""} ${post.body ?? ""}`.toLowerCase().includes(query)
  );
  const engagement = await loadEngagement(visiblePosts.map((post) => post.id));
  const profiles = new Map(
    await Promise.all(
      [...new Set(visiblePosts.map((post) => post.user_id))].map(
        async (id) => [id, await getUserProfile(id)],
      ),
    ),
  );
  const componentPosts = visiblePosts.map((post) => {
    const profile = profiles.get(post.user_id);
    return {
      id: String(post.id),
      type: ["post", "activity", "event"].includes(post.post_type)
        ? post.post_type
        : "post",
      title: post.title,
      body: post.body,
      location: post.location,
      imageUrls: getPostImageUrls(post.img_links, post.img_link),
      createdAt: post.created_at,
      author: {
        id: post.user_id,
        name: profile?.display_name || profile?.username || "Bloom user",
        avatarUrl: isTrustedImageUrl(profile?.avatar_url, "Profile Pictures", true)
          ? profile.avatar_url
          : null,
        supporter: profile?.supporter === true,
      },
      communityName: subcommunity.title,
      likeCount: engagement.likeCounts.get(post.id) ?? 0,
      likedByViewer: engagement.viewerLikes.has(post.id),
      replyCount: engagement.replyCounts.get(post.id) ?? 0,
      canManage: post.user_id === currentUser.id,
      manageHref:
        post.user_id === currentUser.id
          ? `${PAGE_URLS.post}?postId=${post.id}`
          : undefined,
    };
  });
  postsHost.dispatchEvent(
    new CustomEvent("bloom:render-posts", {
      detail: {
        posts: componentPosts,
        emptyMessage: query
          ? t("No posts match your search.")
          : t("No posts yet in this sub-community."),
      },
    }),
  );
}

async function loadPosts() {
  const { data, error } = await supabase
    .rpc("get_visible_posts", { subcommunity_id: subcommunityId });
  if (error) throw error;
  posts = (data ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  await renderPosts();
}

async function loadPage() {
  if (!/^[1-9]\d*$/.test(subcommunityId ?? "")) {
    throw new Error(t("Invalid sub-community."));
  }
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) return;
  await showCurrentUser(currentUser, usernameLabel);

  const { data: record, error } = await supabase
    .from("sub_communities")
    .select("id, title, description, community_parent_uid, owner_id, members")
    .eq("id", subcommunityId)
    .single();
  if (error) throw error;
  subcommunity = record;

  const [{ data: parent, error: parentError }, managerResult] =
    await Promise.all([
      supabase
        .from("Communities")
        .select("id, name, user_id")
        .eq("id", record.community_parent_uid)
        .single(),
      supabase.rpc("is_subcommunity_manager", {
        target_subcommunity: subcommunityId,
      }),
    ]);
  if (parentError) throw parentError;
  parentCommunity = parent;
  canManage = managerResult.data === true;
  renderIdentity();
  await Promise.all([renderMembers(), loadPosts()]);
}

async function toggleLike(postId, currentlyLiked) {
  const query = supabase.from("post_likes");
  const { error } = currentlyLiked
    ? await query.delete().eq("post_id", postId).eq("user_id", currentUser.id)
    : await query.insert({ post_id: postId, user_id: currentUser.id });
  if (error && error.code !== "23505") throw error;
  const liked = error?.code === "23505" ? true : !currentlyLiked;
  const { count, error: countError } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (countError) throw countError;
  return { liked, count: count ?? 0 };
}

async function loadReplies(postId) {
  const { data, error } = await supabase
    .from("post_replies")
    .select("id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at");
  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (reply) => {
      const profile = await getUserProfile(reply.user_id);
      return {
        id: reply.id,
        body: reply.body,
        createdAt: reply.created_at,
        author: {
          id: reply.user_id,
          name: profile?.display_name || profile?.username || "Bloom user",
          avatarUrl: profile?.avatar_url,
          supporter: profile?.supporter === true,
        },
      };
    }),
  );
}

async function createReply(postId, body) {
  const { data, error } = await supabase
    .from("post_replies")
    .insert({ post_id: postId, user_id: currentUser.id, body: body.trim() })
    .select("id, body, created_at")
    .single();
  if (error) throw error;
  const profile = await getUserProfile(currentUser.id);
  return {
    id: data.id,
    body: data.body,
    createdAt: data.created_at,
    author: {
      id: currentUser.id,
      name: profile?.display_name || profile?.username || "Bloom user",
      avatarUrl: profile?.avatar_url,
      supporter: profile?.supporter === true,
    },
  };
}

joinButton.addEventListener("click", async () => {
  const { error } = await supabase.functions.invoke("join-subcommunity", {
    body: { subcommunity_id: subcommunityId },
  });
  if (error) return alert(t("Unable to join this sub-community."));
  window.location.href = subcommunityPageUrl(subcommunityId);
});

editButton.addEventListener("click", () => {
  editName.value = subcommunity.title;
  editDescription.value = subcommunity.description || "";
  editor.classList.add("is-visible");
  editor.setAttribute("aria-hidden", "false");
  editName.focus();
});
function closeEditor() {
  editor.classList.remove("is-visible");
  editor.setAttribute("aria-hidden", "true");
  editButton.focus();
}
cancelButton.addEventListener("click", closeEditor);
closeEditorButton.addEventListener("click", closeEditor);
editor.addEventListener("click", (event) => {
  if (event.target === editor) closeEditor();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editor.classList.contains("is-visible")) closeEditor();
});
saveButton.addEventListener("click", async () => {
  const { error } = await supabase.rpc("update_subcommunity", {
    target_subcommunity: subcommunityId,
    subcommunity_title: editName.value.trim(),
    subcommunity_description: editDescription.value.trim(),
  });
  if (error) return alert(error.message);
  window.location.reload();
});
deleteButton.addEventListener("click", async () => {
  if (!confirm(t("Delete this sub-community and all of its posts? This cannot be undone."))) return;
  const { error } = await supabase.rpc("delete_subcommunity", {
    target_subcommunity: subcommunityId,
  });
  if (error) return alert(error.message);
  window.location.href = parentPageUrl(parentCommunity.id);
});

searchInput.addEventListener("input", () => void renderPosts());
postsHost.addEventListener("bloom:report-post", (event) => {
  void reportPost(event.detail.postId);
});
postsHost.addEventListener("bloom:toggle-post-like", (event) => {
  const { postId, currentlyLiked, resolve, reject } = event.detail;
  toggleLike(postId, currentlyLiked).then(resolve, reject);
});
postsHost.addEventListener("bloom:load-post-replies", (event) => {
  const { postId, resolve, reject } = event.detail;
  loadReplies(postId).then(resolve, reject);
});
postsHost.addEventListener("bloom:create-post-reply", (event) => {
  const { postId, body, resolve, reject } = event.detail;
  createReply(postId, body).then(resolve, reject);
});

await withLoadingOverlay(loadPage, t("Loading sub-community…"));
