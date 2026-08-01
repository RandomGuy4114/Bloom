// Dependencies

import { supabase } from "./supabase.js";
import {
  applyAvatar,
  clearUserProfileCache,
  createPopupShell,
  createPostCard,
  createSupporterBadge,
  formatDateTime,
  getCurrentUserOrRedirect,
  getQueryParameter,
  getUserProfile,
  PAGE_URLS,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js";
import { t } from "./i18n.js";

// Definitions

const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const usernameLabel = document.getElementById("username-label");
const profilePicture = document.querySelector(".profile-pfp");
const profileName = document.querySelector(".profile-name");
const profileUsername = document.querySelector(".profile-username");
const profileDetails = document.querySelector(".profile-details");
const postsContainer = document.querySelector(".posts-container");
const editProfileButton = document.getElementById("editProfileButton");
const requestedUserId = getQueryParameter("uid");
const blockProfileButton = document.getElementById("blockProfileButton");

let currentUser;
let activeUserId;
let currentProfile;
let blockState = {
  blocked: false,
  interactionBlocked: false,
};

// Components

function renderProfile(profile) {
  if (!profile) {
    profileName.textContent = "";
    profileUsername.textContent = "";
    profileDetails.replaceChildren();
    applyAvatar(profilePicture, null);
    editProfileButton.hidden = true;
    blockProfileButton.hidden = true;
    return;
  }

  const username = profile.username || "";
  const displayName = profile.display_name || username;
  profileName.dataset.i18nIgnore = "true";
  profileUsername.dataset.i18nIgnore = "true";
  profileName.textContent = displayName;
  if (profile.supporter === true) {
    profileName.appendChild(createSupporterBadge());
  }
  if (profile.id === 'd026f563-e776-4a67-9fd2-10eef3ec60f1') {
    profileName.appendChild(createSupporterBadge({ compact: false }, "Owner", "#FFD700"));
  }
  profileUsername.textContent = username ? `@${username}` : "";
  applyAvatar(profilePicture, profile.avatar_url, "Profile picture");

  profileDetails.replaceChildren();
  if (profile.bio) {
    const bio = document.createElement("p");
    const bioLabel = document.createElement("strong");
    bioLabel.textContent = "Bio:";
    const bioContent = document.createElement("span");
    bioContent.dataset.i18nIgnore = "true";
    bioContent.textContent = ` ${profile.bio}`;
    bio.append(bioLabel, bioContent);
    profileDetails.appendChild(bio);
  }
  editProfileButton.hidden = activeUserId !== currentUser.id;
  blockProfileButton.hidden = activeUserId === currentUser.id;
  blockProfileButton.textContent = blockState.blocked
    ? t("Unblock User")
    : t("Block User");
  blockProfileButton.setAttribute("aria-pressed", String(blockState.blocked));
}

async function getBlockStatus() {
  if (activeUserId === currentUser.id) {
    return { blocked: false, interaction_blocked: false };
  }

  const { data, error } = await supabase.functions.invoke("block-user", {
    body: {
      action: "status",
      target_user: activeUserId,
    },
  });

  if (error) {
    console.error("Unable to load block status:", error.message);
    return { blocked: false, interaction_blocked: false };
  }

  return data ?? { blocked: false, interaction_blocked: false };
}

async function toggleProfileBlock() {
  if (!currentUser || activeUserId === currentUser.id) return;

  const action = blockState.blocked ? "unblock" : "block";
  const confirmation = blockState.blocked
    ? t("Unblock this user?")
    : t("Block this user? They will no longer be able to contact you.");
  if (!confirm(confirmation)) return;

  await withLoadingOverlay(async () => {
    const { data, error } = await supabase.functions.invoke("block-user", {
      body: {
        action,
        target_user: activeUserId,
      },
    });

    if (error) {
      console.error(`Unable to ${action} user:`, error.message);
      alert(
        action === "block"
          ? t("Unable to block this user.")
          : t("Unable to unblock this user."),
      );
      return;
    }

    blockState = {
      blocked: data?.blocked === true,
      interactionBlocked: data?.interaction_blocked === true,
    };
    renderProfile(currentProfile);

    if (blockState.blocked) {
      renderEmptyState(postsContainer, t("You blocked this user."));
    } else {
      window.location.reload();
    }
  }, action === "block" ? t("Blocking user…") : t("Unblocking user…"));
}

function createEditProfileForm() {
  const isSupporter = currentProfile?.supporter === true;
  const bioLimit = isSupporter ? 1500 : 500;
  const avatarLimitMb = isSupporter ? 15 : 5;
  const form = document.createElement("form");
  form.className = "popup-form edit-profile-form";
  form.innerHTML = `
    <div class="edit-profile-preview" aria-label="Profile picture preview"></div>
    <label for="editProfileDisplayName">Display name</label>
    <input id="editProfileDisplayName" type="text" minlength="1" maxlength="50" autocomplete="name" placeholder="Display name" required>
    <label for="editProfileUsername">Username</label>
    <input id="editProfileUsername" type="text" minlength="3" maxlength="30" autocomplete="username" placeholder="Username" required>
    <label for="editProfileBio">Bio</label>
    <textarea id="editProfileBio" maxlength="${bioLimit}" placeholder="Tell your community about yourself"></textarea>
    <p class="profile-upload-help">${bioLimit} characters maximum${isSupporter ? " with Supporter" : ""}.</p>
    <label for="editProfileAvatar">Profile picture</label>
    <input id="editProfileAvatar" type="file" accept="${isSupporter ? "image/jpeg,image/png,image/webp,image/gif" : "image/jpeg,image/png,image/webp"}">
    <p class="profile-upload-help">JPEG, PNG, or WebP. ${isSupporter ? `Animated GIF supported. Maximum ${avatarLimitMb} MB.` : `Maximum ${avatarLimitMb} MB. Animated GIF avatars require Supporter.`}</p>
    <div class="popup-actions">
      <button type="button" class="secondary-action">Cancel</button>
      <button type="submit">Save changes</button>
    </div>
  `;
  return form;
}

function openEditProfilePopup() {
  if (!currentProfile || activeUserId !== currentUser.id) {
    return;
  }

  const form = createEditProfileForm();
  const { closePopup } = createPopupShell("Edit Profile", form);
  const preview = form.querySelector(".edit-profile-preview");
  const displayNameInput = form.querySelector("#editProfileDisplayName");
  const usernameInput = form.querySelector("#editProfileUsername");
  const bioInput = form.querySelector("#editProfileBio");
  const avatarInput = form.querySelector("#editProfileAvatar");
  const isSupporter = currentProfile.supporter === true;
  const maximumAvatarSize = (isSupporter ? 15 : 5) * 1024 * 1024;
  const maximumBioLength = isSupporter ? 1500 : 500;
  let previewUrl;

  displayNameInput.value = currentProfile.display_name || currentProfile.username || "";
  usernameInput.value = currentProfile.username || "";
  bioInput.value = currentProfile.bio || "";
  applyAvatar(preview, currentProfile.avatar_url, "Profile picture preview");
  form.querySelector(".secondary-action").addEventListener("click", closePopup);

  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    if (!file) {
      applyAvatar(preview, currentProfile.avatar_url, "Profile picture preview");
      return;
    }
    if (!allowedAvatarTypes.has(file.type)) {
      alert("Choose a JPEG, PNG, WebP, or GIF image.");
      avatarInput.value = "";
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }
      applyAvatar(preview, currentProfile.avatar_url, "Profile picture preview");
      return;
    }
    if (file.type === "image/gif" && !isSupporter) {
      alert("Animated GIF profile pictures require Supporter.");
      avatarInput.value = "";
      applyAvatar(preview, currentProfile.avatar_url, "Profile picture preview");
      return;
    }
    if (file.size > maximumAvatarSize) {
      alert(`Profile pictures must be ${isSupporter ? 15 : 5} MB or smaller.`);
      avatarInput.value = "";
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }
      applyAvatar(preview, currentProfile.avatar_url, "Profile picture preview");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    previewUrl = URL.createObjectURL(file);
    applyAvatar(preview, previewUrl, "Profile picture preview");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const displayName = displayNameInput.value.trim();
    const username = usernameInput.value.trim();
    const bio = bioInput.value.trim();
    const avatarFile = avatarInput.files?.[0];

    if (!displayName || displayName.length > 50) {
      alert("Display name must be between 1 and 50 characters.");
      return;
    }
    if (username.length < 3 || username.length > 30) {
      alert("Username must be between 3 and 30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      alert("Username can only contain letters, numbers, and underscores.");
      return;
    }
    if (bio.length > maximumBioLength) {
      alert(`Bio must be ${maximumBioLength} characters or fewer.`);
      return;
    }

    let updatedProfile;
    await withLoadingOverlay(async () => {
      if (avatarFile) {
        const uploadBody = new FormData();
        uploadBody.append("avatar", avatarFile);
        const { data: uploadData, error: uploadError } = await supabase.functions
          .invoke("upload-avatar", { body: uploadBody });

        if (uploadError || !uploadData?.avatarUrl) {
          console.error("Error uploading profile picture:", uploadError?.message ?? "Invalid upload response.");
          alert("The profile picture could not be uploaded. Check that it follows the community guidelines and try again.");
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("update-profile", {
        body: { displayName, username, bio },
      });
      if (error) {
        console.error("Error updating profile:", error.message);
        alert("Your profile could not be saved. Check that its text follows the community guidelines and try again.");
        return;
      }
      updatedProfile = data?.profile;
    }, "Saving profile...");

    if (!updatedProfile) {
      return;
    }

    currentProfile = updatedProfile;
    clearUserProfileCache(currentUser.id);
    renderProfile(currentProfile);
    await showCurrentUser(currentUser, usernameLabel);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    await closePopup();
    alert("Profile updated successfully.");
  });

  displayNameInput.focus();
}

// Data

async function loadProfile() {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) {
    return;
  }

  activeUserId = requestedUserId || currentUser.id;
  const [profile, { data: viewerProfile, error: viewerProfileError }, status] = await Promise.all([
    getUserProfile(activeUserId),
    supabase
      .from("profiles")
      .select("joined_communities")
      .eq("id", currentUser.id)
      .single(),
    getBlockStatus(),
    showCurrentUser(currentUser, usernameLabel),
  ]);

  blockState = {
    blocked: status?.blocked === true,
    interactionBlocked: status?.interaction_blocked === true,
  };
  currentProfile = profile;
  renderProfile(profile);

  if (blockState.interactionBlocked) {
    renderEmptyState(
      postsContainer,
      blockState.blocked
        ? t("You blocked this user.")
        : t("This profile is unavailable."),
    );
    return;
  }

  if (viewerProfileError) {
    console.error("Error fetching joined communities:", viewerProfileError.message);
    renderEmptyState(postsContainer, "Unable to load posts right now.");
    return;
  }

  const joinedCommunityIds = viewerProfile?.joined_communities ?? [];
  if (!joinedCommunityIds.length) {
    renderEmptyState(postsContainer, "No posts are visible from your joined communities.");
    return;
  }

  const { data: posts, error: postsError } = await supabase
    .from("Posts")
    .select("id, title, body, created_at, post_type, img_link, img_links, location, community")
    .eq("user_id", activeUserId)
    .in("community", joinedCommunityIds)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching posts:", postsError.message);
    renderEmptyState(postsContainer, "Unable to load posts right now.");
    return;
  }
  if (!posts?.length) {
    renderEmptyState(postsContainer, "No posts are visible from your joined communities.");
    return;
  }

  const ownsProfile = activeUserId === currentUser.id;
  const cards = posts.map((post) => createPostCard({
    postId: post.id,
    postType: post.post_type,
    title: post.title,
    body: post.body,
    location: post.location,
    imgLink: post.img_link,
    imgLinks: post.img_links,
    footer: `Posted on: ${formatDateTime(post.created_at)}`,
    authorUserId: activeUserId,
    authorName: currentProfile?.display_name || currentProfile?.username || "",
    authorAvatarUrl: currentProfile?.avatar_url || "",
    authorIsSupporter: currentProfile?.supporter === true,
    manageHref: ownsProfile ? `${PAGE_URLS.post}?postId=${post.id}` : null,
  }));
  postsContainer.replaceChildren(...cards);
}

// Events

editProfileButton.addEventListener("click", openEditProfilePopup);
blockProfileButton.addEventListener("click", toggleProfileBlock);

// Initialization

await withLoadingOverlay(loadProfile, "Loading profile...");
