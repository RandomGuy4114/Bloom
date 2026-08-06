// Dependencies

import { applyAvatar, getCurrentUserOrRedirect, showCurrentUser, withLoadingOverlay } from "./main.js?v=msggo3il";
import { supabase } from "./supabase.js?v=msggo3il";
import { callRpc } from "./connection.js?v=msggo3il";

// Definitions

const contactsList = document.getElementById("contactsList");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const imageButton = document.getElementById("messageImageButton");
const imageInput = document.getElementById("messageImageInput");
const usernameLabel = document.getElementById("username-label");
let selectedContact = null;

// Components

function showMessage(text) {
  const message = document.createElement("p");
  message.className = "settings-help";
  message.textContent = text;
  chatMessages.replaceChildren(message);
}

function selectContact(contact) {
  selectedContact = contact;
  chatHeader.textContent = contact.display_name || contact.username || "Bloom user";
  chatInput.disabled = false;
  sendButton.disabled = false;
  imageButton.disabled = false;
  contactsList.querySelectorAll(".contact-item").forEach((button) => {
    const selected = button.dataset.contactId === contact.user_id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  showMessage("Your encrypted conversation will appear here.");
}

function renderContacts(contacts) {
  if (!contacts?.length) {
    const empty = document.createElement("p");
    empty.className = "settings-help";
    empty.textContent = "People you connect with will appear here.";
    contactsList.replaceChildren(empty);
    return;
  }

  const elements = contacts.map((contact) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "contact-item";
    button.dataset.contactId = contact.user_id;
    button.setAttribute("aria-pressed", "false");
    const avatar = document.createElement("span");
    avatar.className = "pfp-frame";
    applyAvatar(avatar, contact.avatar_url, "Profile picture");
    const name = document.createElement("strong");
    name.textContent = contact.display_name || contact.username || "Bloom user";
    button.append(avatar, name);
    button.addEventListener("click", () => selectContact(contact));
    return button;
  });
  contactsList.replaceChildren(...elements);
}

// Initialization

chatInput.disabled = true;
sendButton.disabled = true;
imageButton.disabled = true;
imageButton.addEventListener("click", () => imageInput.click());
sendButton.addEventListener("click", () => {
  if (!selectedContact || !chatInput.value.trim()) return;
  showMessage("Encrypted message sending is unavailable until this device finishes setting up its messaging key.");
});

await withLoadingOverlay(async () => {
  const currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) return;
  await showCurrentUser(currentUser, usernameLabel);
  try {
    const data = await callRpc(
      supabase,
      "get_connect_encounters",
      {},
      { retries: 2 },
    );
    renderContacts(data);
  } catch (error) {
    console.error("Unable to load messaging contacts:", error.message);
    showMessage("Unable to load your contacts right now.");
  }
}, "Loading messages...");
