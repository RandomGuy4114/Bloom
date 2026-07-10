// Dependencies

import { supabase } from "./supabase.js";
import {
  createPostCard,
  formatDateTime,
  getCurrentUserOrRedirect,
  getQueryParameter,
  getUserProfile,
  renderEmptyState,
  withLoadingOverlay,
} from "./main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const profileName = document.querySelector(".profile-name");
const profileDetails = document.querySelector(".profile-details");
const postsContainer = document.querySelector(".posts-container");
const requestedUserId = getQueryParameter("uid");

// Data

async function loadProfile() {
  const user = await getCurrentUserOrRedirect();
  if (!user) {
    return;
  }

  const activeUserId = requestedUserId || user.id;
  const [profile, { data: posts, error: postsError }] = await Promise.all([
    getUserProfile(activeUserId),
    supabase
      .from("Posts")
      .select("id, title, body, created_at, post_type")
      .eq("user_id", activeUserId)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) {
    usernameLabel.textContent = "Profile";
    profileName.textContent = "Profile";
    profileDetails.innerHTML = "<p><strong>Bio:</strong> Unable to load bio.</p>";
  } else {
    const username = profile.username || "Unknown User";
    usernameLabel.dataset.i18nIgnore = "true";
    profileName.dataset.i18nIgnore = "true";
    usernameLabel.textContent = username;
    profileName.textContent = username;
    const bio = document.createElement("p");
    const bioLabel = document.createElement("strong");
    bioLabel.textContent = "Bio:";
    const bioContent = document.createElement("span");
    if (profile.bio) {
      bioContent.dataset.i18nIgnore = "true";
    }
    bioContent.textContent = ` ${profile.bio || "No bio yet."}`;
    bio.append(bioLabel, bioContent);
    profileDetails.replaceChildren(bio);
  }

  if (postsError) {
    console.error("Error fetching posts:", postsError.message);
    renderEmptyState(postsContainer, "Unable to load posts right now.");
    return;
  }
  if (!posts?.length) {
    renderEmptyState(postsContainer, "No posts yet.");
    return;
  }

  const ownsProfile = activeUserId === user.id;
  const cards = posts.map((post) => createPostCard({
    postId: post.id,
    postType: post.post_type,
    title: post.title,
    body: post.body,
    footer: `Posted on: ${formatDateTime(post.created_at)}`,
    manageHref: ownsProfile ? `post.html?postId=${post.id}` : null,
  }));
  postsContainer.replaceChildren(...cards);
}

// Initialization

await withLoadingOverlay(loadProfile, "Loading profile...");
