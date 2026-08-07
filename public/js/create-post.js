// Dependencies

import { supabase } from "./supabase.js?v=msj2vxku";
import {
  canUserPostToCommunity,
  getCurrentUserOrRedirect,
  PAGE_URLS,
  showCurrentUser,
  withLoadingOverlay,
  withTimeout,
} from "./main.js?v=msj2vxku";

// Definitions

const usernameLabel = document.getElementById("username-label");
const communitySelect = document.getElementById("communitySelect");
const titleInput = document.getElementById("titleInput");
const postInput = document.getElementById("postInput");
const createPostButton = document.getElementById("createPostButton");
const postImageInput = document.getElementById("postImageInput");
const postImageButton = document.getElementById("postImageButton");
const postImagePreview = document.getElementById("postImagePreview");
const postImageLimitHint = document.getElementById("postImageLimitHint");
const postTypeButtons = [...document.querySelectorAll("[data-post-type]")];
const allowedPostImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

let currentUser;
let joinedCommunities = [];
let postableCommunityIds = new Set();
let postableSubcommunityIds = new Set();
let selectedPostType = "post";
let currentUserIsSupporter = false;

// Functions

function setComposerDisabled(disabled) {
  [communitySelect, titleInput, postInput, postImageInput, createPostButton].forEach((element) => {
    element.disabled = disabled;
  });
}

async function populateCommunitySelect() {
  communitySelect.replaceChildren();
  postableCommunityIds = new Set();
  postableSubcommunityIds = new Set();

  if (!joinedCommunities.length) {
    const option = new Option("Join a community to post", "");
    communitySelect.appendChild(option);
    setComposerDisabled(true);
    return;
  }

  const [{ data: communities, error }, { data: subcommunities, error: subcommunitiesError }] = await Promise.all([
    supabase
      .from("Communities")
      .select("id, name, global")
      .in("id", joinedCommunities),
    supabase
      .from("sub_communities")
      .select("id, title, community_parent_uid")
      .contains("members", [currentUser.id])
      .in("community_parent_uid", joinedCommunities),
  ]);

  if (error) throw error;
  if (subcommunitiesError) throw subcommunitiesError;

  const isAdmin = currentUser?.app_metadata?.role === "admin";
  const postableCommunities = (communities ?? []).filter(({ global }) => !global || isAdmin);
  postableCommunityIds = new Set(postableCommunities.map(({ id }) => id));
  postableSubcommunityIds = new Set((subcommunities ?? []).map(({ id }) => String(id)));

  if (!postableCommunities.length) {
    communitySelect.appendChild(new Option("Only administrators can post in global communities", ""));
    setComposerDisabled(true);
    return;
  }

  const communityOptions = postableCommunities.map(({ id, name }) => {
    const option = new Option(name, id);
    option.dataset.i18nIgnore = "true";
    return option;
  });
  const subcommunityOptions = (subcommunities ?? []).map(({ id, title, community_parent_uid }) => {
    const option = new Option(`${title} (sub-community)`, community_parent_uid);
    option.dataset.i18nIgnore = "true";
    option.dataset.subcommunityId = String(id);
    return option;
  });
  communitySelect.replaceChildren(...communityOptions, ...subcommunityOptions);
  setComposerDisabled(false);
}

async function loadComposer() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("joined_communities, supporter")
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;
  joinedCommunities = profile?.joined_communities ?? [];
  currentUserIsSupporter = profile?.supporter === true;
  postImageLimitHint.textContent = currentUserIsSupporter
    ? "Supporter: up to 5 images, 25 MB each."
    : "Up to 1 image, 10 MB.";
  await populateCommunitySelect();
}

async function createPost() {
  const title = titleInput.value.trim();
  const body = postInput.value.trim();
  const selectedCommunity = communitySelect.value;
  const selectedSubcommunity = communitySelect.selectedOptions[0]?.dataset.subcommunityId ?? "";
  const imageFiles = [...(postImageInput.files ?? [])];
  const imageLimit = currentUserIsSupporter ? 5 : 1;
  const maximumImageSize = (currentUserIsSupporter ? 25 : 10) * 1024 * 1024;

  if (!title) return alert("Please add a post title before posting.");
  if (!body) return alert("Please write something before posting.");
  if (!selectedCommunity) return alert("Please choose a community to post to.");
  if (selectedSubcommunity && !postableSubcommunityIds.has(selectedSubcommunity)) return alert("You must join this sub-community before posting.");
  if (!postableCommunityIds.has(selectedCommunity)) return alert("Only administrators can create posts in global communities.");
  if (imageFiles.length > imageLimit) return alert(`You can upload up to ${imageLimit} image${imageLimit === 1 ? "" : "s"} per post.`);
  if (imageFiles.some(({ type }) => !allowedPostImageTypes.has(type))) return alert("Choose a JPEG, PNG, WebP, or GIF image.");
  if (imageFiles.some(({ size }) => size > maximumImageSize)) return alert(`Each post image must be ${currentUserIsSupporter ? 25 : 10} MB or smaller.`);

  await withLoadingOverlay(async () => {
    const { allowed, error: accessError } = await canUserPostToCommunity(currentUser.id, selectedCommunity);
    if (accessError || !allowed) {
      alert(accessError ? "Unable to verify posting access. Please try again." : "Only administrators can create posts in global communities.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);
    formData.append("community", selectedCommunity);
    if (selectedSubcommunity) formData.append("subcommunity", selectedSubcommunity);
    formData.append("postType", selectedPostType);
    imageFiles.forEach((file) => formData.append("images", file));
    const { error } = await supabase.functions.invoke("create-post", { body: formData });

    if (error) {
      console.error("Error creating post:", error.message);
      alert("The post could not be published. Check that its text and images follow the community guidelines, then try again.");
      return;
    }

    window.location.href = PAGE_URLS.home;
  }, "Publishing your post...");
}

// Events

postTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPostType = button.dataset.postType;
    postTypeButtons.forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
  });
});

createPostButton.addEventListener("click", createPost);
postImageButton.addEventListener("click", () => postImageInput.click());
postImageInput.addEventListener("change", () => {
  const files = [...(postImageInput.files ?? [])];
  postImagePreview.hidden = !files.length;
  postImagePreview.replaceChildren(...files.map((file, index) => {
    const image = document.createElement("img");
    const previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.alt = `Post image preview ${index + 1}`;
    image.addEventListener("load", () => URL.revokeObjectURL(previewUrl), { once: true });
    return image;
  }));
});

// Initialization

await withLoadingOverlay(async () => {
  currentUser = await withTimeout(getCurrentUserOrRedirect(), 15000, "Authentication took too long.");
  if (!currentUser) return;
  await withTimeout(Promise.all([
    showCurrentUser(currentUser, usernameLabel),
    loadComposer(),
  ]), 25000, "Post creator took too long to load.");
}, "Loading post creator...");
