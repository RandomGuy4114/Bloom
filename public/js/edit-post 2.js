// Dependencies

import { supabase } from "./supabase.js?v=msus69xa";
import {
  getCurrentUserOrRedirect,
  getQueryParameter,
  PAGE_URLS,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js?v=msus69xa";

// Definitions

const form = document.getElementById("editPostForm");
const titleInput = document.getElementById("editPostTitle");
const bodyInput = document.getElementById("editPostBody");
const errorMessage = document.getElementById("editPostError");
const cancelButton = document.getElementById("cancelEditPost");
const usernameLabel = document.getElementById("username-label");
const postId = getQueryParameter("postId");
let currentUser;

// Navigation

function returnToPost() {
  window.location.href = postId
    ? `${PAGE_URLS.post}?postId=${encodeURIComponent(postId)}`
    : PAGE_URLS.home;
}

// Data

async function loadPost() {
  if (!postId || !/^[0-9a-f-]{36}$/i.test(postId)) {
    errorMessage.textContent = "Invalid post.";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }
  const { data: post, error } = await supabase
    .rpc("get_visible_posts", { post_id: postId })
    .single();
  if (error || !post) {
    errorMessage.textContent = "Unable to load this post.";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }
  if (post.user_id !== currentUser.id) {
    errorMessage.textContent = "Only the post owner can edit this post.";
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }
  titleInput.value = post.title || "";
  bodyInput.value = post.body || "";
}

// Events

cancelButton?.addEventListener("click", returnToPost);
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.textContent = "";
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!title || !body) {
    errorMessage.textContent = "Enter a title and post content.";
    return;
  }
  await withLoadingOverlay(async () => {
    const { data, error } = await supabase.functions.invoke("update-post", {
      body: { postId, title, body },
    });
    if (error || !data?.post) {
      errorMessage.textContent = data?.error || "Unable to update the post. Please try again.";
      return;
    }
    returnToPost();
  }, "Saving post...");
});

// Initialization

await withLoadingOverlay(async () => {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) return;
  await Promise.all([showCurrentUser(currentUser, usernameLabel), loadPost()]);
}, "Loading post editor...");
