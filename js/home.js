// Dependencies

import { supabase } from "./supabase.js";
import {
  canUserPostToCommunity,
  createPopupShell,
  createPostCard,
  formatDateTime,
  getCommunityNameFromID,
  getCurrentUserOrRedirect,
  getUserProfile,
  isPostOwner,
  PAGE_URLS,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const feed = document.getElementById("feed");
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
const KonamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

let currentUser;
let joinedCommunities = [];
let postableCommunityIds = new Set();
let selectedPostType = "post";
let currentUserIsAdmin = false;
let currentUserIsSupporter = false;
let konamiIndex = 0;

// Components

async function populateCommunitySelect(selectedCommunityId = null) {
  communitySelect.innerHTML = "";
  postableCommunityIds = new Set();

  if (!joinedCommunities.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Join a community to post";
    communitySelect.appendChild(option);
    communitySelect.disabled = true;
    return false;
  }

  const { data: communities, error } = await supabase
    .from("Communities")
    .select("id, name, global")
    .in("id", joinedCommunities);

  if (error) {
    console.error("Error loading postable communities:", error.message);
    communitySelect.disabled = true;
    return false;
  }

  const postableCommunities = (communities ?? []).filter((community) => (
    !community.global || currentUserIsAdmin
  ));
  postableCommunityIds = new Set(postableCommunities.map((community) => community.id));

  if (!postableCommunities.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Only administrators can post in global communities";
    communitySelect.appendChild(option);
    communitySelect.disabled = true;
    return false;
  }

  const options = postableCommunities.map((community, index) => {
    const option = document.createElement("option");
    option.value = community.id;
    option.dataset.i18nIgnore = "true";
    option.textContent = community.name;
    option.selected = selectedCommunityId
      ? community.id === selectedCommunityId
      : index === 0;
    return option;
  });

  communitySelect.replaceChildren(...options);
  communitySelect.disabled = false;
  return true;
}

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
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("joined_communities, supporter")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Error fetching joined communities:", error.message);
    renderEmptyState(feed, "Unable to load your feed right now.");
    return;
  }

  joinedCommunities = profile?.joined_communities ?? [];
  currentUserIsSupporter = profile?.supporter === true;
  postImageLimitHint.textContent = currentUserIsSupporter
    ? "Supporter: up to 5 images, 25 MB each."
    : "Up to 1 image, 10 MB.";
  currentUserIsAdmin = currentUser?.app_metadata?.role === "admin";

  if (!joinedCommunities.length) {
    postInput.disabled = true;
    titleInput.disabled = true;
    postImageInput.disabled = true;
    createPostButton.disabled = true;
    communitySelect.disabled = true;
    await populateCommunitySelect();
    renderEmptyState(feed, "Join a community to see posts here.");
    return;
  }

  const canCreatePost = await populateCommunitySelect(communitySelect.value);
  postInput.disabled = !canCreatePost;
  titleInput.disabled = !canCreatePost;
  postImageInput.disabled = !canCreatePost;
  createPostButton.disabled = !canCreatePost;

  const { data: posts, error: postsError } = await supabase
    .from("Posts")
    .select("*")
    .in("community", joinedCommunities)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching posts from joined communities:", postsError.message);
    renderEmptyState(feed, "Unable to load your feed right now.");
    return;
  }

  await renderFeedPosts(posts);
}

async function createPost() {
  const title = titleInput.value.trim();
  const body = postInput.value.trim();
  const selectedCommunity = communitySelect.value;
  const imageFiles = [...(postImageInput.files ?? [])];
  const imageLimit = currentUserIsSupporter ? 5 : 1;
  const maximumPostImageSize = (currentUserIsSupporter ? 25 : 10) * 1024 * 1024;

  if (!title) {
    alert("Please add a post title before posting.");
    return;
  }
  if (!body) {
    alert("Please write something before posting.");
    return;
  }
  if (!joinedCommunities.length) {
    alert("Join a community before posting.");
    return;
  }
  if (!selectedCommunity) {
    alert("Please choose a community to post to.");
    return;
  }
  if (!postableCommunityIds.has(selectedCommunity)) {
    alert("Only administrators can create posts in global communities.");
    return;
  }
  if (imageFiles.length > imageLimit) {
    alert(`You can upload up to ${imageLimit} image${imageLimit === 1 ? "" : "s"} per post.`);
    return;
  }
  if (imageFiles.some((file) => !allowedPostImageTypes.has(file.type))) {
    alert("Choose a JPEG, PNG, WebP, or GIF image.");
    return;
  }
  if (imageFiles.some((file) => file.size > maximumPostImageSize)) {
    alert(`Each post image must be ${currentUserIsSupporter ? 25 : 10} MB or smaller.`);
    return;
  }

  await withLoadingOverlay(async () => {
    const { allowed, error: accessError } = await canUserPostToCommunity(currentUser.id, selectedCommunity);
    if (accessError) {
      alert("Unable to verify posting access. Please try again.");
      return;
    }
    if (!allowed) {
      alert("Only administrators can create posts in global communities.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);
    formData.append("community", selectedCommunity);
    formData.append("postType", selectedPostType);
    imageFiles.forEach((file) => formData.append("images", file));
    const { error } = await supabase.functions.invoke("create-post", { body: formData });

    if (error) {
      console.error("Error creating post:", error.message);
      alert("The post could not be published. Check that its text and images follow the community guidelines, then try again.");
      return;
    }

    titleInput.value = "";
    postInput.value = "";
    postImageInput.value = "";
    postImagePreview.hidden = true;
    postImagePreview.replaceChildren();
    await loadJoinedCommunities();
  }, "Publishing your post...");
}

async function checkFirstTimeUser() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("FirstTimeOpen")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Error checking user profile:", error.message);
    return;
  }

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

// Events

postTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPostType = button.dataset.postType;
    postTypeButtons.forEach((option) => {
      const isSelected = option === button;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
    });
  });
});

createPostButton?.addEventListener("click", createPost);
postImageButton?.addEventListener("click", () => postImageInput.click());
postImageInput?.addEventListener("change", () => {
  const files = [...(postImageInput.files ?? [])];
  postImagePreview.replaceChildren();
  postImagePreview.hidden = !files.length;
  if (!files.length) {
    return;
  }
  files.forEach((file, index) => {
    const image = document.createElement("img");
    const previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.alt = `Post image preview ${index + 1}`;
    image.addEventListener("load", () => URL.revokeObjectURL(previewUrl), { once: true });
    postImagePreview.appendChild(image);
  });
});
postInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createPost();
  }
});

// Initialization

await withLoadingOverlay(async () => {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) {
    return;
  }

  await Promise.all([
    showCurrentUser(currentUser, usernameLabel),
    loadJoinedCommunities(),
    checkFirstTimeUser(),
  ]);
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
