// Dependencies

import {
  applyAvatar,
  createSupporterBadge,
  getCurrentUserOrRedirect,
  PAGE_URLS,
  showCurrentUser,
  withLoadingOverlay,
  withTimeout,
} from "./main.js?v=msx4sye2";
import { supabase } from "./supabase.js?v=msx4sye2";
import { callRpc } from "./connection.js?v=msx4sye2";

// Definitions

const usernameLabel = document.getElementById("username-label");
const connectPageStatus = document.getElementById("connectPageStatus");
const manageConnectButton = document.getElementById("manageConnectButton");
const connectedUsers = document.getElementById("connectedUsers");

// Components

function renderConnectedUsers(users) {
  if (!users?.length) {
    const empty = document.createElement("p");
    empty.className = "settings-help";
    empty.textContent = "People you encounter through Connect will appear here.";
    connectedUsers.replaceChildren(empty);
    return;
  }

  const cards = users.map((user) => {
    const link = document.createElement("a");
    link.className = "connected-user";
    link.href = `${PAGE_URLS.profile}?uid=${encodeURIComponent(user.user_id)}`;
    const avatar = document.createElement("div");
    avatar.className = "pfp-frame";
    applyAvatar(avatar, user.avatar_url, "Profile picture");
    const details = document.createElement("span");
    details.className = "connected-user-details";
    const name = document.createElement("strong");
    name.dataset.i18nIgnore = "true";
    name.textContent = user.display_name || user.username || "Bloom user";
    const username = document.createElement("span");
    username.dataset.i18nIgnore = "true";
    username.textContent = user.username ? `@${user.username}` : "";
    details.append(name, username);
    link.append(avatar, details);
    if (user.supporter === true) link.appendChild(createSupporterBadge({ compact: true }));
    return link;
  });
  connectedUsers.replaceChildren(...cards);
}

async function loadConnectedUsers() {
  try {
    const data = await callRpc(
      supabase,
      "get_connect_encounters",
      {},
      { retries: 2 },
    );
    renderConnectedUsers(data);
  } catch (error) {
    console.error("Unable to load connected people:", error.message);
    return;
  }
}

// Events

manageConnectButton.addEventListener("click", () => {
  window.location.href = PAGE_URLS.settings;
});

// Initialization

await withLoadingOverlay(async () => {
  const currentUser = await withTimeout(
    getCurrentUserOrRedirect(),
    15000,
    "Authentication took too long.",
  );
  if (!currentUser) return;
  const [, profileResult] = await Promise.all([
    showCurrentUser(currentUser, usernameLabel),
    supabase.from("profiles").select("connect_enabled").eq("id", currentUser.id).single(),
    loadConnectedUsers(),
  ]);
  connectPageStatus.textContent = profileResult.data?.connect_enabled === true
    ? "Connect is active. Background location alerts are enabled."
    : "Connect is off. Enable it in Settings when you want to use proximity alerts.";
}, "Loading Connect...");

const connectedUsersRefresh = window.setInterval(loadConnectedUsers, 20_000);
window.addEventListener("bloom:connect-encounter", loadConnectedUsers);
window.addEventListener("pagehide", () => window.clearInterval(connectedUsersRefresh), { once: true });
