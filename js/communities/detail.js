// Dependencies

import { supabase } from "../supabase.js";
import {
  createPostCard,
  filterBySearch,
  formatDateTime,
  getCurrentUserOrRedirect,
  getQueryParameter,
  getUserLocation,
  getUserProfile,
  isWithinCommunityRadius,
  isPostOwner,
  joinCommunity,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "../main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const postsContainer = document.getElementById("com-posts");
const communityNameElement = document.getElementById("comName");
const communityDescriptionElement = document.getElementById("comDesc");
const joinCommunityButton = document.getElementById("joinCommunityButton");
const searchPostInput = document.getElementById("searchPostInput");
const communityID = getQueryParameter("communityID");

let user;
let userLocation;
let communityDetails;
let communityPosts = [];
let isCurrentUserMember = false;

// Components

function renderCommunityPosts() {
  const visiblePosts = filterBySearch(
    communityPosts,
    searchPostInput?.value ?? "",
    (post) => `${post.title ?? ""} ${post.body ?? ""} ${post.authorName} ${post.communityName}`,
  );

  if (!visiblePosts.length) {
    const message = communityPosts.length
      ? "No posts match your search."
      : "No posts yet in this community.";
    renderEmptyState(postsContainer, message);
    return;
  }

  const cards = visiblePosts.map((post) => createPostCard({
    postId: post.id,
    postType: post.post_type,
    title: post.title,
    body: post.body,
    footer: `Posted on ${formatDateTime(post.created_at)}`,
    authorName: post.authorName,
    communityName: post.communityName,
    manageHref: isPostOwner(post, user.id) ? `post.html?postId=${post.id}` : null,
  }));
  postsContainer.replaceChildren(...cards);
}

function updateJoinButton() {
  if (!joinCommunityButton || !communityDetails || !user) {
    return;
  }

  if (isCurrentUserMember || communityDetails.members?.includes(user.id)) {
    joinCommunityButton.textContent = "Joined";
    joinCommunityButton.disabled = true;
    return;
  }

  if (!isWithinCommunityRadius(communityDetails, userLocation)) {
    joinCommunityButton.textContent = "Outside Community Area";
    joinCommunityButton.disabled = true;
    return;
  }

  joinCommunityButton.textContent = "Join Community";
  joinCommunityButton.disabled = false;
}

// Data

async function loadCommunity() {
  if (!communityID) {
    renderEmptyState(postsContainer, "No community selected.");
    joinCommunityButton?.setAttribute("disabled", "");
    return;
  }

  const [{ data: community, error: communityError }, { data: posts, error: postsError }] = await Promise.all([
    supabase
      .from("Communities")
      .select("name, description, members, global, latitude, longitude, radius_meters")
      .eq("id", communityID)
      .single(),
    supabase.from("Posts").select("*").eq("community", communityID).order("created_at", { ascending: false }),
  ]);

  if (communityError) {
    console.error("Error fetching community details:", communityError.message);
    renderEmptyState(postsContainer, "Unable to load community details.");
    joinCommunityButton?.setAttribute("disabled", "");
    return;
  }

  communityDetails = community;
  const currentUserProfile = await getUserProfile(user.id);
  isCurrentUserMember = currentUserProfile?.joined_communities?.includes(communityID) ?? false;
  if (community.name) {
    communityNameElement.dataset.i18nIgnore = "true";
    communityNameElement.textContent = community.name;
  } else {
    delete communityNameElement.dataset.i18nIgnore;
    communityNameElement.textContent = "Community Name";
  }
  if (community.description) {
    communityDescriptionElement.dataset.i18nIgnore = "true";
    communityDescriptionElement.textContent = community.description;
  } else {
    delete communityDescriptionElement.dataset.i18nIgnore;
    communityDescriptionElement.textContent = "No description available.";
  }

  if (postsError) {
    console.error("Error fetching community posts:", postsError.message);
    renderEmptyState(postsContainer, "Unable to load posts for this community.");
    return;
  }

  if (!posts?.length) {
    communityPosts = [];
    renderCommunityPosts();
    return;
  }

  const authors = await Promise.all(posts.map((post) => getUserProfile(post.user_id ?? post.author)));
  communityPosts = posts.map((post, index) => ({
    ...post,
    authorName: authors[index]?.username || "Unknown",
    communityName: community.name,
  }));
  renderCommunityPosts();
}

// Events

searchPostInput?.addEventListener("input", renderCommunityPosts);

joinCommunityButton?.addEventListener("click", async () => {
  if (!communityID) {
    return;
  }

  await withLoadingOverlay(async () => {
    const { error, status } = await joinCommunity(user.id, communityID, userLocation);
    if (error) {
      alert("Unable to join the community at this time.");
      return;
    }
    if (status === "out_of_range") {
      updateJoinButton();
      alert("You must be within this community's radius to join it.");
      return;
    }
    if (status === "already_joined") {
      isCurrentUserMember = true;
      updateJoinButton();
      return;
    }

    isCurrentUserMember = true;
    communityDetails.members = [...(communityDetails.members ?? []), user.id];
    updateJoinButton();
    alert("Successfully joined the community!");
  }, "Joining community...");
});

// Initialization

await withLoadingOverlay(async () => {
  user = await getCurrentUserOrRedirect();
  if (!user) {
    return;
  }

  await Promise.all([
    showCurrentUser(user, usernameLabel),
    loadCommunity(),
    getUserLocation().then((location) => {
      userLocation = location;
    }),
  ]);
  updateJoinButton();
}, "Loading community...");
