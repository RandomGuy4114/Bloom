// Dependencies

import { supabase } from "./supabase.js";
import {
  applyAvatar,
  clearUserProfileCache,
  createPopupShell,
  createPostCard,
  formatDateTime,
  getCurrentUserOrRedirect,
  getQueryParameter,
  getUserProfile,
  PAGE_URLS,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js";

// Definitions

const avatarBucket = "Profile Pictures";
const maximumAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const usernameLabel = document.getElementById("username-label");
const profilePicture = document.querySelector(".profile-pfp");
const profileName = document.querySelector(".profile-name");
const profileUsername = document.querySelector(".profile-username");
const profileDetails = document.querySelector(".profile-details");
const postsContainer = document.querySelector(".posts-container");
const editProfileButton = document.getElementById("editProfileButton");
const requestedUserId = getQueryParameter("uid");

let currentUser;
let activeUserId;
let currentProfile;

// Components

function renderProfile(profile) {
  if (!profile) {
    profileName.textContent = "";
    profileUsername.textContent = "";
    profileDetails.replaceChildren();
    applyAvatar(profilePicture, null);
    editProfileButton.hidden = true;
    return;
  }

  const username = profile.username || "";
  const displayName = profile.display_name || username;
  profileName.dataset.i18nIgnore = "true";
  profileUsername.dataset.i18nIgnore = "true";
  profileName.textContent = displayName;
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
}

function createEditProfileForm() {
  const form = document.createElement("form");
  form.className = "popup-form edit-profile-form";
  form.innerHTML = `
    <div class="edit-profile-preview" aria-label="Profile picture preview"></div>
    <label for="editProfileDisplayName">Display name</label>
    <input id="editProfileDisplayName" type="text" minlength="1" maxlength="50" autocomplete="name" placeholder="Display name" required>
    <label for="editProfileUsername">Username</label>
    <input id="editProfileUsername" type="text" minlength="3" maxlength="30" autocomplete="username" placeholder="Username" required>
    <label for="editProfileBio">Bio</label>
    <textarea id="editProfileBio" maxlength="500" placeholder="Tell your community about yourself"></textarea>
    <label for="editProfileAvatar">Profile picture</label>
    <input id="editProfileAvatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
    <p class="profile-upload-help">JPEG, PNG, WebP, or GIF. Maximum 5 MB.</p>
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
    if (file.size > maximumAvatarSize) {
      alert("Profile pictures must be 5 MB or smaller.");
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
    if (bio.length > 500) {
      alert("Bio must be 500 characters or fewer.");
      return;
    }

    let updatedProfile;
    await withLoadingOverlay(async () => {
      let avatarUrl = currentProfile.avatar_url || "";

      if (avatarFile) {
        const avatarPath = `${currentUser.id}/avatar`;
        const { error: uploadError } = await supabase.storage
          .from(avatarBucket)
          .upload(avatarPath, avatarFile, {
            upsert: true,
            cacheControl: "3600",
            contentType: avatarFile.type,
          });

        if (uploadError) {
          console.error("Error uploading profile picture:", uploadError.message);
          alert("Unable to upload your profile picture. Please try again.");
          return;
        }

        const { data: publicUrlData } = supabase.storage.from(avatarBucket).getPublicUrl(avatarPath);
        avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, username, bio, avatar_url: avatarUrl })
        .eq("id", currentUser.id)
        .select("*")
        .single();

      if (error?.code === "23505") {
        alert("That username is already in use.");
        return;
      }
      if (error) {
        console.error("Error updating profile:", error.message);
        alert("Unable to update your profile. Please try again.");
        return;
      }

      updatedProfile = data;
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
  const [profile, { data: posts, error: postsError }] = await Promise.all([
    getUserProfile(activeUserId),
    supabase
      .from("Posts")
      .select("id, title, body, created_at, post_type, img_link, location")
      .eq("user_id", activeUserId)
      .order("created_at", { ascending: false }),
    showCurrentUser(currentUser, usernameLabel),
  ]);

  currentProfile = profile;
  renderProfile(profile);

  if (postsError) {
    console.error("Error fetching posts:", postsError.message);
    renderEmptyState(postsContainer, "Unable to load posts right now.");
    return;
  }
  if (!posts?.length) {
    renderEmptyState(postsContainer, "No posts yet.");
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
    footer: `Posted on: ${formatDateTime(post.created_at)}`,
    authorUserId: activeUserId,
    authorName: currentProfile?.display_name || currentProfile?.username || "",
    authorAvatarUrl: currentProfile?.avatar_url || "",
    manageHref: ownsProfile ? `${PAGE_URLS.post}?postId=${post.id}` : null,
  }));
  postsContainer.replaceChildren(...cards);
}

// Events

editProfileButton.addEventListener("click", openEditProfilePopup);

// Initialization

await withLoadingOverlay(loadProfile, "Loading profile...");
