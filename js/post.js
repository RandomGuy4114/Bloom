// Dependencies

import { supabase } from "./supabase.js";
import {
  attachPostOptions,
  attachPostTypeBadge,
  getCurrentUserOrRedirect,
  getQueryParameter,
  isPostOwner as isPostOwnerRecord,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const postContainer = document.getElementById("post");
const editPostButton = document.getElementById("editPostButton");
const deletePostButton = document.getElementById("deletePostButton");
const managePostTools = document.getElementById("managePostTools");
const postId = getQueryParameter("postId");

let user;
let isPostOwner = false;
managePostTools.hidden = true;

// Data

async function loadPost() {
  if (!postId) {
    renderEmptyState(postContainer, "No post selected.");
    return;
  }

  const { data: post, error } = await supabase
    .from("Posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) {
    console.error("Error fetching post:", error.message);
    renderEmptyState(postContainer, "Unable to load post details.");
    return;
  }

  const postTitle = document.getElementById("postTitle");
  const postContent = document.getElementById("postContent");
  isPostOwner = isPostOwnerRecord(post, user.id);
  managePostTools.hidden = !isPostOwner;
  if (post.title) {
    postTitle.dataset.i18nIgnore = "true";
  }
  if (post.body) {
    postContent.dataset.i18nIgnore = "true";
  }
  postTitle.textContent = post.title || "Untitled Post";
  postContent.textContent = post.body || "No content available.";
  postTitle.style.paddingRight = "40px";
  attachPostTypeBadge(postContainer, post.post_type);
  attachPostOptions(postContainer, {
    postId,
    onManage: isPostOwner
      ? () => managePostTools.scrollIntoView({ behavior: "smooth", block: "center" })
      : null,
  });
}

// Events

editPostButton?.addEventListener("click", () => {
  if (!isPostOwner) {
    alert("You cannot manage this post.");
    return;
  }
  if (!postId) {
    alert("Post ID not found.");
    return;
  }

  window.location.href = `edit-post.html?postId=${postId}`;
});

deletePostButton?.addEventListener("click", async () => {
  if (!isPostOwner) {
    alert("You cannot manage this post.");
    return;
  }
  if (!postId) {
    alert("Post ID not found.");
    return;
  }
  if (!confirm("Are you sure you want to delete this post?")) {
    return;
  }

  await withLoadingOverlay(async () => {
    const { error } = await supabase.from("Posts").delete().eq("id", postId);
    if (error) {
      console.error("Error deleting post:", error.message);
      alert("Failed to delete the post. Please try again.");
      return;
    }

    alert("Post deleted successfully.");
    window.location.href = "home.html";
  }, "Deleting post...");
});

// Initialization

await withLoadingOverlay(async () => {
  user = await getCurrentUserOrRedirect();
  if (!user) {
    return;
  }

  await Promise.all([
    showCurrentUser(user, usernameLabel),
    loadPost(),
  ]);
}, "Loading post...");
