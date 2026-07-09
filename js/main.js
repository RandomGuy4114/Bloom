import { supabase } from "./supabase.js";
import { animate, scroll } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm"

const communityNameCache = new Map();

export async function getCurrentUserOrRedirect(redirectUrl = "login.html") {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Error fetching user:", error?.message ?? "No user session found.");
    window.location.href = redirectUrl;
    return null;
  }

  return user;
}

export async function getUserProfile(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error.message);
    return null;
  }

  return profile;
}

export async function getCommunityNameFromID(communityID) {
  if (communityNameCache.has(communityID)) {
    return communityNameCache.get(communityID);
  }

  const { data: community, error } = await supabase
    .from("Communities")
    .select("name")
    .eq("id", communityID)
    .single();

  if (error) {
    console.error("Error fetching community name:", error.message);
    return null;
  }

  communityNameCache.set(communityID, community.name);
  return community.name;
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

export function renderEmptyState(container, message) {
  container.innerHTML = `
    <div class="post">
      <p style="margin: 0; color: #666;">${message}</p>
    </div>
  `;
}

export function createPostCard({ title, body, footer }) {
  const card = document.createElement("div");
  card.classList.add("post");
  card.innerHTML = `
    <h3 style="margin: 0 0 8px 0;">${title || "Untitled Post"}</h3>
    <p style="margin: 0; color: #333; line-height: 1.4;">${body || ""}</p>
    ${footer ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: grey;">${footer}</p>` : ""}
  `;
  return card;
}

export function PopupIn(element, options = {}) {
  const { duration = 0.5, easing = "ease-in-out" } = options;

  animate(
    element,
    { opacity: [0, 1], scale: [0.8, 1] },
    { duration, easing }
  );
}

export function PopupOut(element, options = {}) {
  const { duration = 0.5, easing = "ease-in-out" } = options;

  animate(
    element,
    { opacity: [1, 0], scale: [1, 0.8] },
    { duration, easing }
  ).finished.then(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}