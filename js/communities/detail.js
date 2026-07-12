// Dependencies

import { supabase } from "../supabase.js";
import {
  applyAvatar,
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
  leaveCommunity,
  PAGE_URLS,
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
const communityMembersContainer = document.getElementById("communityMembersContainer");
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
    (post) => `${post.title ?? ""} ${post.body ?? ""} ${post.location ?? ""} ${post.authorName} ${post.communityName}`,
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
    location: post.location,
    imgLink: post.img_link,
    footer: `Posted on ${formatDateTime(post.created_at)}`,
    authorUserId: post.authorUserId,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    communityName: post.communityName,
    manageHref: isPostOwner(post, user.id) ? `${PAGE_URLS.post}?postId=${post.id}` : null,
  }));
  postsContainer.replaceChildren(...cards);
}

async function renderCommunityMembers(memberIds = []) {
  const uniqueMemberIds = [...new Set(memberIds.filter(Boolean))];
  const profiles = await Promise.all(uniqueMemberIds.map(async (memberId) => ({
    memberId,
    profile: await getUserProfile(memberId),
  })));
  const memberLinks = profiles.flatMap(({ memberId, profile }) => {
    if (!profile) {
      return [];
    }

    const link = document.createElement("a");
    link.className = "community-member";
    link.href = `${PAGE_URLS.profile}?uid=${encodeURIComponent(memberId)}`;
    link.setAttribute("aria-label", "Open member profile");
    const avatar = document.createElement("div");
    avatar.className = "pfp-frame community-member-avatar";
    applyAvatar(avatar, profile.avatar_url, "Profile picture");
    const name = document.createElement("span");
    name.dataset.i18nIgnore = "true";
    name.textContent = profile.display_name || profile.username || "";
    link.append(avatar, name);
    return [link];
  });

  if (!memberLinks.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "community-members-empty";
    emptyState.textContent = "No members to display.";
    communityMembersContainer.replaceChildren(emptyState);
    return;
  }

  communityMembersContainer.replaceChildren(...memberLinks);
}

function updateJoinButton() {
  if (!joinCommunityButton || !communityDetails || !user) {
    return;
  }

  if (isCurrentUserMember || communityDetails.members?.includes(user.id)) {
    joinCommunityButton.textContent = "Leave Community";
    joinCommunityButton.classList.add("danger-action");
    joinCommunityButton.disabled = false;
    return;
  }

  joinCommunityButton.classList.remove("danger-action");

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
  await renderCommunityMembers(community.members ?? []);
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("joined_communities")
    .eq("id", user.id)
    .single();
  isCurrentUserMember = currentUserProfile?.joined_communities?.includes(communityID) ?? false;
  if (community.name) {
    communityNameElement.dataset.i18nIgnore = "true";
    communityNameElement.textContent = community.name;
  } else {
    delete communityNameElement.dataset.i18nIgnore;
    communityNameElement.textContent = "";
  }
  if (community.description) {
    communityDescriptionElement.dataset.i18nIgnore = "true";
    communityDescriptionElement.textContent = community.description;
  } else {
    delete communityDescriptionElement.dataset.i18nIgnore;
    communityDescriptionElement.textContent = "";
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
    authorUserId: post.user_id ?? post.author,
    authorName: authors[index]?.display_name || authors[index]?.username || "",
    authorAvatarUrl: authors[index]?.avatar_url || "",
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

  if (isCurrentUserMember || communityDetails?.members?.includes(user.id)) {
    if (!window.confirm("Are you sure you want to leave this community?")) {
      return;
    }

    await withLoadingOverlay(async () => {
      const { error } = await leaveCommunity(user.id, communityID);
      if (error) {
        alert("Unable to leave the community at this time.");
        return;
      }

      isCurrentUserMember = false;
      communityDetails.members = (communityDetails.members ?? []).filter((memberId) => memberId !== user.id);
      updateJoinButton();
      await renderCommunityMembers(communityDetails.members);
      alert("You left the community.");
    }, "Leaving community...");
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
      communityDetails.members = [...new Set([...(communityDetails.members ?? []), user.id])];
      updateJoinButton();
      await renderCommunityMembers(communityDetails.members);
      return;
    }
    if (status !== "joined") {
      alert("Unable to join the community at this time.");
      return;
    }

    isCurrentUserMember = true;
    communityDetails.members = [...(communityDetails.members ?? []), user.id];
    updateJoinButton();
    await renderCommunityMembers(communityDetails.members);
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
