// Dependencies

import { supabase } from "./supabase.js?v=msx5ymzr";
import {
  getCurrentUserOrRedirect,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js?v=msx5ymzr";

// Definitions

const usernameLabel = document.getElementById("username-label");
const connectPatreonButton = document.getElementById("connectPatreonButton");
const supporterStatus = document.getElementById("supporterStatus");

let currentUser;

// Components

function showPatreonResult() {
  const result = new URLSearchParams(window.location.search).get("patreon");
  const messages = {
    active: "Your Patreon Supporter membership is active.",
    inactive: "This Patreon account does not have the required active membership.",
    linked: "This Patreon account is already linked to another Bloom account.",
    denied: "Patreon authorization was canceled.",
    error: "Unable to verify your Patreon membership. Please try again.",
  };

  if (!messages[result]) {
    return;
  }

  supporterStatus.textContent = messages[result];
  supporterStatus.dataset.status = result;
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function loadSupporterStatus() {
  const { data, error } = await supabase
    .from("profiles")
    .select("supporter, patreon_user_id, patreon_membership_status, supporter_verified_at")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Unable to load Patreon status:", error.message);
    return;
  }

  if (!new URLSearchParams(window.location.search).has("patreon")) {
    supporterStatus.textContent = data?.supporter
      ? "Your Patreon Supporter membership is active."
      : data?.patreon_user_id
        ? "Your Patreon membership is not currently active."
        : "Connect Patreon to verify your Supporter membership.";
    supporterStatus.dataset.status = data?.supporter ? "active" : "inactive";
  }
}

// Events

connectPatreonButton.addEventListener("click", async () => {
  connectPatreonButton.disabled = true;
  try {
    await withLoadingOverlay(async () => {
      const { data, error } = await supabase.functions.invoke("start-patreon-oauth");
      let authorizationUrl;
      try {
        authorizationUrl = new URL(data?.authorizationUrl);
      } catch {
        authorizationUrl = null;
      }

      if (error || authorizationUrl?.origin !== "https://www.patreon.com") {
        console.error("Unable to start Patreon authorization:", error);
        alert("Unable to connect Patreon. Please try again.");
        return;
      }

      window.location.assign(authorizationUrl.href);
    }, "Connecting to Patreon...");
  } finally {
    connectPatreonButton.disabled = false;
  }
});

// Initialization

connectPatreonButton.disabled = true;

await withLoadingOverlay(async () => {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) {
    return;
  }

  await Promise.all([
    showCurrentUser(currentUser, usernameLabel),
    loadSupporterStatus(),
  ]);
  showPatreonResult();
  connectPatreonButton.disabled = false;
}, "Loading supporter page...");
