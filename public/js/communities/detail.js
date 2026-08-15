// Dependencies

import { supabase } from "../supabase.js?v=msurssz8";
import { t } from "../i18n.js?v=msurssz8";
import {
  applyAvatar,
  createPopupShell,
  createPostCard,
  createSupporterBadge,
  filterBySearch,
  formatDateTime,
  getCurrentUserOrRedirect,
  getOwnedCommunityRequestUUIDs,
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
  respondToCommunityJoinRequest,
  setCommunityPrivacy,
  showCurrentUser,
  withLoadingOverlay,
} from "../main.js?v=msurssz8";

// Definitions

const usernameLabel = document.getElementById("username-label");
const postsContainer = document.getElementById("com-posts");
const communityNameElement = document.getElementById("comName");
const communityDescriptionElement = document.getElementById("comDesc");
const communityMetaElement = document.getElementById("comMemb");
const joinCommunityButton = document.getElementById("joinCommunityButton");
const searchPostInput = document.getElementById("searchPostInput");
const communityMembersContainer = document.getElementById("communityMembersContainer");
const communityBannerElement = document.getElementById("communityBanner");
const communityPictureElement = document.getElementById("communityPicture");
const editCommunityButton = document.getElementById("editCommunityButton");
const manageJoinRequestsButton = document.getElementById("manageJoinRequestsButton");
const businessCommunityTag = document.getElementById("businessCommunityTag");
const communityID = getQueryParameter("communityID");

let user;
let userLocation;
let communityDetails;
let communityPosts = [];
let isCurrentUserMember = false;
let currentUserProfile;

const allowedBannerTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedCommunityPictureTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function getCommunityImagePath(imageUrl) {
  if (!isTrustedImageUrl(imageUrl, "Community Images")) return null;
  const url = new URL(imageUrl);
  const prefix = "/storage/v1/object/public/Community%20Images/";
  return decodeURIComponent(url.pathname.slice(prefix.length));
}

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
  if (!communityMembersContainer) return;

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

  if (communityDetails.user_id === user.id) {
    joinCommunityButton.textContent = "Community Owner";
    joinCommunityButton.classList.remove("danger-action");
    joinCommunityButton.disabled = true;
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

  joinCommunityButton.textContent = communityDetails.private === true
    ? "Request to Join"
    : "Join Community";
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
  communityPictureElement.replaceChildren();
  communityPictureElement.classList.toggle(
    "community-picture--fallback",
    !isTrustedImageUrl(communityDetails?.picture_url, "Community Images"),
  );
  if (isTrustedImageUrl(communityDetails?.picture_url, "Community Images")) {
    const image = document.createElement("img");
    image.src = communityDetails.picture_url;
    image.alt = `${communityDetails.name || "Community"} community image`;
    image.decoding = "async";
    image.addEventListener("error", () => {
      communityPictureElement.replaceChildren();
      communityPictureElement.classList.add("community-picture--fallback");
      communityPictureElement.textContent = communityDetails?.name?.trim().charAt(0).toLocaleUpperCase() || "?";
    }, { once: true });
    communityPictureElement.appendChild(image);
  } else {
    communityPictureElement.textContent = communityDetails?.name?.trim().charAt(0).toLocaleUpperCase() || "?";
    communityPictureElement.setAttribute("aria-label", `${communityDetails?.name || "Community"} community image`);
  }
  communityDescriptionElement.dataset.i18nIgnore = "true";
  communityDescriptionElement.textContent = communityDetails?.description || "";
  if (communityMetaElement) {
    const memberCount = communityDetails?.members?.length ?? 0;
    const memberLabel = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
    communityMetaElement.dataset.i18nIgnore = "true";
    communityMetaElement.textContent = communityDetails?.location_label
      ? `${memberLabel} · ${communityDetails.location_label}`
      : memberLabel;
  }
  businessCommunityTag.hidden = communityDetails?.business !== true;
  editCommunityButton.hidden = communityDetails?.user_id !== user?.id;
  manageJoinRequestsButton.hidden = !(
    communityDetails?.private === true
    && communityDetails?.user_id === user?.id
  );
}

async function openJoinRequestManager() {
  if (communityDetails?.user_id !== user?.id || communityDetails?.private !== true) {
    return;
  }

  const content = document.createElement("div");
  content.className = "community-join-request-manager";
  const requestList = document.createElement("div");
  requestList.className = "community-join-request-list";
  content.appendChild(requestList);
  createPopupShell("Join Requests", content);

  const { data: requesterIds, error } = await getOwnedCommunityRequestUUIDs(communityID);
  if (error) {
    renderEmptyState(requestList, "Unable to load join requests.");
    return;
  }

  if (!requesterIds.length) {
    renderEmptyState(requestList, "There are no pending join requests.");
    return;
  }

  const requests = await Promise.all(requesterIds.map(async (requesterId) => ({
    requesterId,
    profile: await getUserProfile(requesterId),
  })));

  const requestRows = requests.map(({ requesterId, profile }) => {
    const row = document.createElement("div");
    row.className = "community-join-request";

    const identity = document.createElement("a");
    identity.className = "community-join-request-identity";
    identity.href = `${PAGE_URLS.profile}?uid=${encodeURIComponent(requesterId)}`;
    const avatar = document.createElement("span");
    avatar.className = "pfp-frame community-member-avatar";
    applyAvatar(avatar, profile?.avatar_url, "Profile picture");
    const name = document.createElement("strong");
    name.dataset.i18nIgnore = "true";
    name.textContent = profile?.display_name || profile?.username || "Bloom user";
    identity.append(avatar, name);
    if (profile?.supporter === true) {
      identity.appendChild(createSupporterBadge({ compact: true }));
    }

    const actions = document.createElement("div");
    actions.className = "community-join-request-actions";
    const acceptButton = document.createElement("button");
    acceptButton.type = "button";
    acceptButton.textContent = "Accept";
    const denyButton = document.createElement("button");
    denyButton.type = "button";
    denyButton.className = "danger-action";
    denyButton.textContent = "Deny";
    actions.append(acceptButton, denyButton);
    row.append(identity, actions);

    const respond = async (approved) => {
      acceptButton.disabled = true;
      denyButton.disabled = true;
      const { status, error: responseError } = await respondToCommunityJoinRequest(
        communityID,
        requesterId,
        approved,
      );
      if (responseError || !["approved", "denied"].includes(status)) {
        if (status === "request_not_found") {
          alert("This request is no longer pending.");
          row.remove();
        } else {
          alert("Unable to update this join request.");
          acceptButton.disabled = false;
          denyButton.disabled = false;
        }
        return;
      }

      if (status === "approved") {
        communityDetails.members = [...new Set([
          ...(communityDetails.members ?? []),
          requesterId,
        ])];
        await renderCommunityMembers(communityDetails.members);
      }

      row.remove();
      if (!requestList.querySelector(".community-join-request")) {
        renderEmptyState(requestList, "There are no pending join requests.");
      }
    };

    acceptButton.addEventListener("click", () => {
      void withLoadingOverlay(() => respond(true), "Accepting request...");
    });
    denyButton.addEventListener("click", () => {
      void withLoadingOverlay(() => respond(false), "Denying request...");
    });
    return row;
  });

  requestList.replaceChildren(...requestRows);
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
    <label class="settings-toggle" for="editCommunityPrivate">
      <input id="editCommunityPrivate" type="checkbox">
      <span>Private community</span>
    </label>
    <p class="community-image-help">Private communities require owner approval before people can join, and their posts are only visible to members.</p>
    <label for="editCommunityPicture">Community image</label>
    <div class="community-image-preview" aria-label="Community image preview"></div>
    <input id="editCommunityPicture" type="file" accept="image/jpeg,image/png,image/webp">
    <button id="removeCommunityPicture" type="button" class="secondary-action" ${communityDetails.picture_url ? "" : "hidden"}>Remove community image</button>
    <p class="community-image-help">JPEG, PNG, or WebP. Maximum 5 MB. Leave empty to keep the current image.</p>
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
  const privacyInput = form.querySelector("#editCommunityPrivate");
  const bannerInput = form.querySelector("#editCommunityBanner");
  const pictureInput = form.querySelector("#editCommunityPicture");
  const removePictureButton = form.querySelector("#removeCommunityPicture");
  const removeBannerButton = form.querySelector("#removeCommunityBanner");
  const deleteCommunityButton = form.querySelector("#deleteCommunityButton");
  const preview = form.querySelector(".community-banner-preview");
  const picturePreview = form.querySelector(".community-image-preview");
  let previewUrl;
  let picturePreviewUrl;
  let removeBanner = false;
  let removePicture = false;

  nameInput.value = communityDetails.name || "";
  bioInput.value = communityDetails.description || "";
  privacyInput.checked = communityDetails.private === true;
  if (isTrustedImageUrl(communityDetails.picture_url, "Community Images")) {
    const image = document.createElement("img");
    image.src = communityDetails.picture_url;
    image.alt = "Current community image";
    picturePreview.appendChild(image);
  } else {
    picturePreview.classList.add("community-picture--fallback");
    picturePreview.textContent = communityDetails.name?.trim().charAt(0).toLocaleUpperCase() || "?";
  }
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
  removePictureButton.addEventListener("click", () => {
    removePicture = !removePicture;
    pictureInput.value = "";
    if (picturePreviewUrl) {
      URL.revokeObjectURL(picturePreviewUrl);
      picturePreviewUrl = null;
    }
    picturePreview.replaceChildren();
    picturePreview.classList.toggle("community-picture--fallback", removePicture);
    picturePreview.textContent = removePicture
      ? nameInput.value.trim().charAt(0).toLocaleUpperCase() || "?"
      : "";
    removePictureButton.textContent = removePicture ? "Undo image removal" : "Remove community image";
    if (!removePicture && isTrustedImageUrl(communityDetails.picture_url, "Community Images")) {
      const image = document.createElement("img");
      image.src = communityDetails.picture_url;
      image.alt = "Current community image";
      picturePreview.appendChild(image);
    }
  });
  pictureInput.addEventListener("change", () => {
    const file = pictureInput.files?.[0];
    if (!file) return;
    if (!allowedCommunityPictureTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
      alert("Choose a JPEG, PNG, or WebP community image that is 5 MB or smaller.");
      pictureInput.value = "";
      return;
    }
    if (picturePreviewUrl) URL.revokeObjectURL(picturePreviewUrl);
    picturePreviewUrl = URL.createObjectURL(file);
    removePicture = false;
    removePictureButton.hidden = false;
    removePictureButton.textContent = "Remove community image";
    picturePreview.classList.remove("community-picture--fallback");
    const image = document.createElement("img");
    image.src = picturePreviewUrl;
    image.alt = "New community image preview";
    picturePreview.replaceChildren(image);
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
    const makePrivate = privacyInput.checked;
    const banner = bannerInput.files?.[0];
    const picture = pictureInput.files?.[0];
    if (!name || name.length > 100 || !description || description.length > 1000) {
      alert("Community names must be 1–100 characters and bios must be 1–1000 characters.");
      return;
    }
    if (communityDetails.private === true && !makePrivate && !window.confirm(
      "Making this community public will clear its pending join requests. Continue?",
    )) {
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

      if (makePrivate !== (communityDetails.private === true)) {
        const { error: privacyError } = await setCommunityPrivacy(communityID, makePrivate);
        if (privacyError) {
          alert("The community details were saved, but its privacy could not be updated.");
          communityDetails = { ...communityDetails, name, description };
          renderCommunityIdentity();
          return;
        }
      }

      let pictureUrl = communityDetails.picture_url;
      if (picture || removePicture) {
        const previousPath = getCommunityImagePath(communityDetails.picture_url);
        let uploadedPath = null;
        if (picture) {
          const extension = picture.type === "image/png" ? "png" : picture.type === "image/webp" ? "webp" : "jpg";
          uploadedPath = `${user.id}/${communityID}/picture-${Date.now()}.${extension}`;
          const { error: uploadPictureError } = await supabase.storage.from("Community Images").upload(uploadedPath, picture, {
            contentType: picture.type,
            cacheControl: "3600",
            upsert: false,
          });
          if (uploadPictureError) {
            alert("The community details were saved, but the community image could not be uploaded.");
            communityDetails = { ...communityDetails, name, description, private: makePrivate };
            renderCommunityIdentity();
            return;
          }
          pictureUrl = supabase.storage.from("Community Images").getPublicUrl(uploadedPath).data.publicUrl;
        } else {
          pictureUrl = null;
        }

        const { error: pictureError } = await supabase.rpc("set_community_picture", {
          target_community: communityID,
          new_picture_url: pictureUrl,
        });
        if (pictureError) {
          if (uploadedPath) await supabase.storage.from("Community Images").remove([uploadedPath]);
          alert("The community details were saved, but the community image could not be updated.");
          communityDetails = { ...communityDetails, name, description, private: makePrivate };
          renderCommunityIdentity();
          return;
        }
        if (previousPath) await supabase.storage.from("Community Images").remove([previousPath]);
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
          communityDetails = {
            ...communityDetails,
            name,
            description,
            private: makePrivate,
            picture_url: pictureUrl,
          };
          renderCommunityIdentity();
          return;
        }
        bannerUrl = data.bannerUrl;
      }

      communityDetails = {
        ...communityDetails,
        name,
        description,
        private: makePrivate,
        picture_url: pictureUrl,
        banner_url: bannerUrl,
      };
      saved = true;
    }, "Saving community...");

    if (saved) {
      renderCommunityIdentity();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (picturePreviewUrl) URL.revokeObjectURL(picturePreviewUrl);
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

  const [{ data: community, error: communityError }, { data: unorderedPosts, error: postsError }] = await Promise.all([
    supabase
      .from("Communities")
      .select("name, description, user_id, banner_url, picture_url, members, global, business, private, location_label, latitude, longitude, radius_meters")
      .eq("id", communityID)
      .single(),
    supabase.rpc("get_visible_posts", { community_ids: [communityID], top_level_only: true }),
  ]);
  const posts = (unorderedPosts ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
manageJoinRequestsButton?.addEventListener("click", () => {
  void openJoinRequestManager();
});

joinCommunityButton?.addEventListener("click", async () => {
  if (!communityID) {
    return;
  }

  if (communityDetails?.user_id === user.id) {
    alert("Community owners cannot leave their communities.");
    return;
  }

  if (isCurrentUserMember || communityDetails?.members?.includes(user.id)) {
    if (!window.confirm("Are you sure you want to leave this community?")) {
      return;
    }

    await withLoadingOverlay(async () => {
      const { error, status } = await leaveCommunity(user.id, communityID);
      if (error) {
        alert("Unable to leave the community at this time.");
        return;
      }
      if (status === "owner_cannot_leave") {
        alert("Community owners cannot leave their communities.");
        updateJoinButton();
        return;
      }
      if (status !== "left" && status !== "not_joined") {
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
    if (status === "private_requested") {
      alert("This community is private. Your request to join has been sent to the community owner for approval.");
      return;
    }
    
    if (status === "already_requested") {
      alert("You have already requested to join this private community. Please wait for the community owner to approve your request.");
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

user = await getCurrentUserOrRedirect();

await Promise.all([
  showCurrentUser(user, usernameLabel),
  loadCommunity(),
  getUserLocation().then((location) => {
    userLocation = location;
  }),
]);
updateJoinButton();