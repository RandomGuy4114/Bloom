// Dependencies

import { supabase } from "../supabase.js";
import { t } from "../i18n.js";
import {
  applyAvatar,
  createPopupShell,
  createPostCard,
  createSupporterBadge,
  filterBySearch,
  formatDateTime,
  getCurrentUserOrRedirect,
  getQueryParameter,
  getUserLocation,
  getUserProfile,
  isWithinCommunityRadius,
  isPostOwner,
  isTrustedImageUrl,
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
const communityBannerElement = document.getElementById("communityBanner");
const editCommunityButton = document.getElementById("editCommunityButton");
const communityID = getQueryParameter("communityID");

let user;
let userLocation;
let communityDetails;
let communityPosts = [];
let isCurrentUserMember = false;
let currentUserProfile;

const allowedBannerTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    imgLinks: post.img_links,
    footer: `Posted on ${formatDateTime(post.created_at)}`,
    authorUserId: post.authorUserId,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    authorIsSupporter: post.authorIsSupporter,
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
    if (profile.supporter === true) {
      link.appendChild(createSupporterBadge({ compact: true }));
    }
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

function renderCommunityIdentity() {
  const bannerUrl = communityDetails?.banner_url;
  communityBannerElement.replaceChildren();
  communityBannerElement.hidden = !isTrustedImageUrl(bannerUrl, "Community Banners");
  if (!communityBannerElement.hidden) {
    const image = document.createElement("img");
    image.src = bannerUrl;
    image.alt = `${communityDetails.name || "Community"} banner`;
    image.loading = "eager";
    image.decoding = "async";
    communityBannerElement.appendChild(image);
  }

  communityNameElement.dataset.i18nIgnore = "true";
  communityNameElement.textContent = communityDetails?.name || "";
  communityDescriptionElement.dataset.i18nIgnore = "true";
  communityDescriptionElement.textContent = communityDetails?.description || "";
  editCommunityButton.hidden = communityDetails?.user_id !== user?.id;
}

function openCommunityEditor() {
  if (communityDetails?.user_id !== user?.id) {
    return;
  }

  const isSupporter = currentUserProfile?.supporter === true;
  const form = document.createElement("form");
  form.className = "popup-form community-editor-form";
  form.innerHTML = `
    <label for="editCommunityName">Community name</label>
    <input id="editCommunityName" type="text" minlength="1" maxlength="100" required>
    <label for="editCommunityBio">Community bio</label>
    <textarea id="editCommunityBio" minlength="1" maxlength="1000" required></textarea>
    <label for="editCommunityBanner">Community banner</label>
    <div class="community-banner-preview" aria-label="Community banner preview"></div>
    <input id="editCommunityBanner" type="file" accept="image/jpeg,image/png,image/webp" ${isSupporter ? "" : "disabled"}>
    <button id="removeCommunityBanner" type="button" class="secondary-action" ${isSupporter && communityDetails.banner_url ? "" : "hidden"}>Remove banner</button>
    <p class="community-banner-help">${isSupporter ? "JPEG, PNG, or WebP. Maximum 10 MB. Selecting a new image replaces the current banner." : "Community banners require Bloom Supporter. You can still edit the name and bio."}</p>
    <div class="popup-actions">
      <button id="deleteCommunityButton" type="button" class="danger-action">Delete Community</button>
      <button type="button" class="secondary-action">Cancel</button>
      <button type="submit">Save changes</button>
    </div>
  `;

  const { closePopup } = createPopupShell("Edit Community", form);
  const nameInput = form.querySelector("#editCommunityName");
  const bioInput = form.querySelector("#editCommunityBio");
  const bannerInput = form.querySelector("#editCommunityBanner");
  const removeBannerButton = form.querySelector("#removeCommunityBanner");
  const deleteCommunityButton = form.querySelector("#deleteCommunityButton");
  const preview = form.querySelector(".community-banner-preview");
  let previewUrl;
  let removeBanner = false;

  nameInput.value = communityDetails.name || "";
  bioInput.value = communityDetails.description || "";
  if (isTrustedImageUrl(communityDetails.banner_url, "Community Banners")) {
    const image = document.createElement("img");
    image.src = communityDetails.banner_url;
    image.alt = "Current community banner";
    preview.appendChild(image);
  }

  form.querySelector(".popup-actions .secondary-action").addEventListener("click", closePopup);
  deleteCommunityButton.addEventListener("click", async () => {
    const confirmation = window.prompt(t("Type {name} to permanently delete this community and all of its posts.", {
      name: communityDetails.name,
    }));
    if (confirmation !== communityDetails.name) {
      if (confirmation !== null) alert("The community name did not match. Nothing was deleted.");
      return;
    }

    let deleted = false;
    await withLoadingOverlay(async () => {
      const { data, error } = await supabase.functions.invoke("delete-community", {
        body: { communityId: communityID },
      });
      if (error || data?.deleted !== true) {
        console.error("Error deleting community:", error?.message || data?.error || "Invalid response");
        alert("Unable to delete the community.");
        return;
      }
      deleted = true;
    }, "Deleting community...");

    if (deleted) {
      window.location.assign(PAGE_URLS.communities);
    }
  });
  removeBannerButton.addEventListener("click", () => {
    removeBanner = !removeBanner;
    bannerInput.value = "";
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    preview.replaceChildren();
    removeBannerButton.textContent = removeBanner ? "Undo banner removal" : "Remove banner";
    if (!removeBanner && isTrustedImageUrl(communityDetails.banner_url, "Community Banners")) {
      const image = document.createElement("img");
      image.src = communityDetails.banner_url;
      image.alt = "Current community banner";
      preview.appendChild(image);
    }
  });
  bannerInput.addEventListener("change", () => {
    const file = bannerInput.files?.[0];
    if (!file) return;
    if (!allowedBannerTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
      alert("Choose a JPEG, PNG, or WebP banner that is 10 MB or smaller.");
      bannerInput.value = "";
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    removeBanner = false;
    removeBannerButton.textContent = "Remove banner";
    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = "New community banner preview";
    preview.replaceChildren(image);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const description = bioInput.value.trim();
    const banner = bannerInput.files?.[0];
    if (!name || name.length > 100 || !description || description.length > 1000) {
      alert("Community names must be 1–100 characters and bios must be 1–1000 characters.");
      return;
    }

    let saved = false;
    await withLoadingOverlay(async () => {
      const { error } = await supabase
        .from("Communities")
        .update({ name, description })
        .eq("id", communityID)
        .eq("user_id", user.id);
      if (error) {
        console.error("Error updating community:", error.message);
        alert("Unable to update the community.");
        return;
      }

      let bannerUrl = communityDetails.banner_url;
      if (banner || removeBanner) {
        const uploadBody = new FormData();
        uploadBody.append("communityId", communityID);
        if (removeBanner) {
          uploadBody.append("action", "remove");
        } else {
          uploadBody.append("banner", banner);
        }
        const { data, error: uploadError } = await supabase.functions.invoke("upload-community-banner", { body: uploadBody });
        if (uploadError || !data || !("bannerUrl" in data)) {
          console.error("Error uploading community banner:", uploadError?.message || "Invalid response");
          alert("The community details were saved, but the banner could not be uploaded.");
          communityDetails = { ...communityDetails, name, description };
          renderCommunityIdentity();
          return;
        }
        bannerUrl = data.bannerUrl;
      }

      communityDetails = { ...communityDetails, name, description, banner_url: bannerUrl };
      saved = true;
    }, "Saving community...");

    if (saved) {
      renderCommunityIdentity();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      closePopup();
    }
  });
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
      .select("name, description, user_id, banner_url, members, global, latitude, longitude, radius_meters")
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("joined_communities, supporter")
    .eq("id", user.id)
    .single();
  currentUserProfile = profile;
  isCurrentUserMember = profile?.joined_communities?.includes(communityID) ?? false;
  renderCommunityIdentity();

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
    authorIsSupporter: authors[index]?.supporter === true,
    communityName: community.name,
  }));
  renderCommunityPosts();
}

// Events

searchPostInput?.addEventListener("input", renderCommunityPosts);
editCommunityButton?.addEventListener("click", openCommunityEditor);

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
