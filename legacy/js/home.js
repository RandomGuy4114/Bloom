// Dependencies

import { supabase } from "./supabase.js";
import {
  createPopupShell,
  formatEventLocation,
  getCommunityNameFromID,
  getCurrentUserOrRedirect,
  getPostImageUrls,
  getUserProfile,
  getUserLocation,
  isPostOwner,
  isTrustedImageUrl,
  PAGE_URLS,
  reportPost,
  showCurrentUser,
  withLoadingOverlay,
  withTimeout,
} from "./main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const feed = document.getElementById("feed");
const bloomConnectStatusCircle = document.getElementById("bloomConnectStatusCircle");
const desktopHomeTabs = [...document.querySelectorAll("[data-home-tab]")];
const desktopHomePanels = [...document.querySelectorAll("[data-home-panel]")];
const KonamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

let currentUser;
let konamiIndex = 0;

// Functions

function selectDesktopHomeTab(selectedTab) {
  desktopHomeTabs.forEach((tab) => {
    const selected = tab.dataset.homeTab === selectedTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  desktopHomePanels.forEach((panel) => {
    panel.hidden = panel.dataset.homePanel !== selectedTab;
  });
}

// Components

async function renderFeedPosts(posts) {
  if (!posts?.length) {
    renderPostFeed([], "No posts yet. Join a community or write the first update.");
    return;
  }

  const [postDetails, engagement] = await Promise.all([
    Promise.all(posts.map(async (post) => {
    const [communityName, authorProfile] = await Promise.all([
      getCommunityNameFromID(post.community),
      getUserProfile(post.user_id ?? post.author),
    ]);
    return {
      authorUserId: post.user_id ?? post.author,
      communityName: communityName || "",
      authorName: authorProfile?.display_name || authorProfile?.username || "",
      authorAvatarUrl: authorProfile?.avatar_url || "",
      authorIsSupporter: authorProfile?.supporter === true,
    };
    })),
    loadPostEngagement(posts.map((post) => post.id)),
  ]);

  const componentPosts = posts.map((post, index) => ({
    id: String(post.id),
    type: ["post", "activity", "event"].includes(post.post_type) ? post.post_type : "post",
    title: post.title,
    body: post.body,
    location: formatEventLocation(post.location),
    imageUrls: getPostImageUrls(post.img_links, post.img_link),
    createdAt: post.created_at,
    author: {
      id: postDetails[index].authorUserId,
      name: postDetails[index].authorName,
      avatarUrl: isTrustedImageUrl(postDetails[index].authorAvatarUrl, "Profile Pictures", true)
        ? postDetails[index].authorAvatarUrl
        : null,
      supporter: postDetails[index].authorIsSupporter,
    },
    communityName: postDetails[index].communityName,
    likeCount: engagement.likeCounts.get(post.id) ?? 0,
    likedByViewer: engagement.viewerLikes.has(post.id),
    replyCount: engagement.replyCounts.get(post.id) ?? 0,
    canManage: isPostOwner(post, currentUser.id),
    manageHref: isPostOwner(post, currentUser.id) ? `${PAGE_URLS.post}?postId=${post.id}` : undefined,
  }));
  renderPostFeed(componentPosts);
}

async function loadPostEngagement(postIds) {
  const likeCounts = new Map();
  const replyCounts = new Map();
  const viewerLikes = new Set();
  if (!postIds.length) return { likeCounts, replyCounts, viewerLikes };

  const [{ data: likes, error: likesError }, { data: replies, error: repliesError }] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("post_replies").select("post_id").in("post_id", postIds),
  ]);

  if (likesError) console.error("Unable to load post likes:", likesError.message);
  if (repliesError) console.error("Unable to load post replies:", repliesError.message);

  (likes ?? []).forEach((like) => {
    likeCounts.set(like.post_id, (likeCounts.get(like.post_id) ?? 0) + 1);
    if (like.user_id === currentUser?.id) viewerLikes.add(like.post_id);
  });
  (replies ?? []).forEach((reply) => {
    replyCounts.set(reply.post_id, (replyCounts.get(reply.post_id) ?? 0) + 1);
  });
  return { likeCounts, replyCounts, viewerLikes };
}

async function togglePostLike(postId, currentlyLiked) {
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

async function loadPostReplies(postId) {
  const { data, error } = await supabase
    .from("post_replies")
    .select("id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const authorIds = [...new Set((data ?? []).map((reply) => reply.user_id))];
  const profiles = new Map(await Promise.all(authorIds.map(async (id) => [id, await getUserProfile(id)])));
  return (data ?? []).map((reply) => {
    const profile = profiles.get(reply.user_id);
    return {
      id: reply.id,
      body: reply.body,
      createdAt: reply.created_at,
      author: {
        id: reply.user_id,
        name: profile?.display_name || profile?.username || "Bloom user",
        avatarUrl: isTrustedImageUrl(profile?.avatar_url, "Profile Pictures", true) ? profile.avatar_url : null,
        supporter: profile?.supporter === true,
      },
    };
  });
}

async function createPostReply(postId, body) {
  const normalizedBody = String(body ?? "").trim();
  if (!normalizedBody || normalizedBody.length > 2000) throw new Error("Replies must be between 1 and 2,000 characters.");
  const { data, error } = await supabase
    .from("post_replies")
    .insert({ post_id: postId, user_id: currentUser.id, body: normalizedBody })
    .select("id, user_id, body, created_at")
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
      avatarUrl: isTrustedImageUrl(profile?.avatar_url, "Profile Pictures", true) ? profile.avatar_url : null,
      supporter: profile?.supporter === true,
    },
  };
}

function renderPostFeed(posts, emptyMessage) {
  feed?.dispatchEvent(new CustomEvent("bloom:render-posts", {
    detail: { posts, emptyMessage },
  }));
}

// Data

async function loadJoinedCommunities() {
  const location = await getUserLocation();
  const { data: posts, error: postsError } = await supabase.rpc("get_home_feed", {
    user_latitude: location?.latitude ?? null,
    user_longitude: location?.longitude ?? null,
    feed_limit: 100,
  });

  if (postsError) {
    console.error("Error fetching posts from joined communities:", postsError.message);
    renderPostFeed([], "Unable to load your feed right now.");
    return;
  }

  await renderFeedPosts(posts);
}

async function checkFirstTimeUser() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("FirstTimeOpen, connect_enabled")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Error checking user profile:", error.message);
    return;
  }

  bloomConnectStatusCircle?.classList.toggle("connected", profile?.connect_enabled === true);

  if (!profile?.FirstTimeOpen) {
    return;
  }

  const content = document.createElement("div");
  content.innerHTML = `
    <p>Welcome to Bloom! Here's a quick guide to get you started:</p>
    <ul>
      <li>Join communities that interest you.</li>
      <li>Create posts and share your thoughts.</li>
      <li>Engage with other members by commenting and liking posts.</li>
    </ul>
    <p>Enjoy your time here!</p>
  `;
  createPopupShell("Welcome to Bloom!", content);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ FirstTimeOpen: false })
    .eq("id", currentUser.id);

  if (updateError) {
    console.error("Error updating FirstTimeOpen flag:", updateError.message);
  }
}

window.addEventListener("bloom:connect-encounter", () => {
  bloomConnectStatusCircle?.classList.remove("connected");
  bloomConnectStatusCircle?.classList.add("newUserDetected");
});

desktopHomeTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectDesktopHomeTab(tab.dataset.homeTab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = desktopHomeTabs[(index + direction + desktopHomeTabs.length) % desktopHomeTabs.length];
    selectDesktopHomeTab(nextTab.dataset.homeTab);
    nextTab.focus();
  });
});

// Initialization

await withLoadingOverlay(async () => {
  try {
    currentUser = await withTimeout(
      getCurrentUserOrRedirect(),
      15000,
      "Authentication took too long.",
    );
    if (!currentUser) return;

    await withTimeout(Promise.all([
      showCurrentUser(currentUser, usernameLabel),
      loadJoinedCommunities(),
      checkFirstTimeUser(),
    ]), 25000, "Feed loading took too long.");
  } catch (error) {
    console.error("Unable to finish loading the feed:", error.message);
    renderPostFeed([], "Unable to load your feed right now. Check your connection and try again.");
  }
}, "Loading your feed...");

feed?.addEventListener("bloom:report-post", (event) => {
  const postId = event.detail?.postId;
  if (postId) void reportPost(postId);
});

feed?.addEventListener("bloom:toggle-post-like", async (event) => {
  const { postId, currentlyLiked, resolve, reject } = event.detail ?? {};
  try {
    resolve(await togglePostLike(postId, currentlyLiked));
  } catch (error) {
    console.error("Unable to update post like:", error.message);
    alert("Unable to update this like. Please try again.");
    reject(error);
  }
});

feed?.addEventListener("bloom:load-post-replies", async (event) => {
  const { postId, resolve, reject } = event.detail ?? {};
  try {
    resolve(await loadPostReplies(postId));
  } catch (error) {
    console.error("Unable to load post replies:", error.message);
    alert("Unable to load replies. Please try again.");
    reject(error);
  }
});

feed?.addEventListener("bloom:create-post-reply", async (event) => {
  const { postId, body, resolve, reject } = event.detail ?? {};
  try {
    resolve(await createPostReply(postId, body));
  } catch (error) {
    console.error("Unable to create post reply:", error.message);
    alert(error.message || "Unable to add your reply. Please try again.");
    reject(error);
  }
});


window.addEventListener("keydown", (event) => {
  const key = event.key;
  if (key === KonamiCode[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KonamiCode.length) {
      alert("Konami Code activated! You found the secret!");
      window.location.href = "https://randomguy4114.github.io/The-Epic-Calculator/"
      konamiIndex = 0;
    }
  } else {
    konamiIndex = 0;
  }
});

// Console

const logo = [
  "  ____  _     ___   ___  __  __ ",
  " | __ )| |   / _ \\ / _ \\|  \\/  |",
  " |  _ \\| |  | | | | | | | |\\/| |",
  " | |_) | |__| |_| | |_| | |  | |",
  " |____/|_____\\___/ \\___/|_|  |_|",
].join("\n");

console.log(logo);
console.log(
  "%c Welcome To The Bloom Console! %c ALPHA ",
  "background: #2563eb; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 3px 0 0 3px;",
  "background: #1e293b; color: #94a3b8; padding: 3px 8px; border-radius: 0 3px 3px 0;",
);
console.log(
  "%c  ATTENTION  %c DO NOT share any sensitive information here.",
  "background: #eab308; color: #000; font-weight: bold; padding: 2px 5px; border-radius: 3px;",
  "color: #f87171; font-weight: bold;",
);
