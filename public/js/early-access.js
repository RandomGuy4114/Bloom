// Dependencies

import {
  createSupporterBadge,
  getCurrentUserOrRedirect,
  getUserProfile,
  PAGE_URLS,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js?v=mtk6ih8q";

// Definitions

const usernameLabel = document.getElementById("username-label");
const earlyAccessContent = document.getElementById("earlyAccessContent");

// Components

function renderEarlyAccess(profile) {
  earlyAccessContent.replaceChildren();
  const heading = document.createElement("h2");

  if (profile?.supporter === true) {
    heading.textContent = "Supporter Early Access";
    heading.appendChild(createSupporterBadge({ compact: true }));
    const message = document.createElement("p");
    message.textContent = "You have access. New experiments will appear here when they are ready to test.";
    earlyAccessContent.append(heading, message);
    return;
  }

  heading.textContent = "Supporter required";
  const message = document.createElement("p");
  message.textContent = "Early Access experiments are available to Bloom Supporters.";
  const supporterButton = document.createElement("button");
  supporterButton.type = "button";
  supporterButton.textContent = "View Bloom Supporter";
  supporterButton.addEventListener("click", () => {
    window.location.href = PAGE_URLS.supporter ?? new URL("../supporter/", window.location.href).href;
  });
  earlyAccessContent.append(heading, message, supporterButton);
}

// Initialization

await withLoadingOverlay(async () => {
  const user = await getCurrentUserOrRedirect();
  if (!user) {
    return;
  }
  const [profile] = await Promise.all([
    getUserProfile(user.id),
    showCurrentUser(user, usernameLabel),
  ]);
  renderEarlyAccess(profile);
}, "Loading early access...");
