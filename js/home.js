// Dependencies

import { supabase } from "./supabase.js";
import {
  createPopupShell,
  createPostCard,
  formatDateTime,
  getCommunityNameFromID,
  getCurrentUserOrRedirect,
  getUserProfile,
  getUserLocation,
  isPostOwner,
  PAGE_URLS,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
  withTimeout,
} from "./main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const feed = document.getElementById("feed");
const bloomConnectStatusCircle = document.getElementById("bloomConnectStatusCircle");
const KonamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

let currentUser;
let konamiIndex = 0;

// Components

async function renderFeedPosts(posts) {
  if (!posts?.length) {
    renderEmptyState(feed, "No posts yet. Join a community or write the first update.");
    return;
  }

  const postDetails = await Promise.all(posts.map(async (post) => {
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
  }));

  const cards = posts.map((post, index) => createPostCard({
    postId: post.id,
    postType: post.post_type,
    title: post.title,
    body: post.body,
    location: post.location,
    imgLink: post.img_link,
    imgLinks: post.img_links,
    footer: `Posted on: ${formatDateTime(post.created_at)}`,
    authorUserId: postDetails[index].authorUserId,
    authorName: postDetails[index].authorName,
    authorAvatarUrl: postDetails[index].authorAvatarUrl,
    authorIsSupporter: postDetails[index].authorIsSupporter,
    communityName: postDetails[index].communityName,
    manageHref: isPostOwner(post, currentUser.id) ? `${PAGE_URLS.post}?postId=${post.id}` : null,
  }));
  feed.replaceChildren(...cards);
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
    renderEmptyState(feed, "Unable to load your feed right now.");
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
    renderEmptyState(feed, "Unable to load your feed right now. Check your connection and try again.");
  }
}, "Loading your feed...");


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
