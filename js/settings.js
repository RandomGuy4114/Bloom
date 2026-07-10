// Dependencies

import { createPopupShell, getCurrentUserOrRedirect, withLoadingOverlay } from "./main.js";
import { getLanguage, setLanguage } from "./i18n.js";
import { supabase } from "./supabase.js";

// Definitions

const changePasswordButton = document.getElementById("changePasswordButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const changeLanguageButton = document.getElementById("changeLangButton");
const languageDropdown = document.getElementById("LangDropdown");

// Dialogs

function openChangePasswordPopup() {
  const form = document.createElement("form");
  form.className = "popup-form";
  form.innerHTML = `
    <label for="currentPassword">Current password</label>
    <input id="currentPassword" type="password" autocomplete="current-password">
    <label for="newPassword">New password</label>
    <input id="newPassword" type="password" autocomplete="new-password">
    <label for="confirmPassword">Confirm new password</label>
    <input id="confirmPassword" type="password" autocomplete="new-password">
    <div class="popup-actions">
      <button type="button" class="secondary-action">Cancel</button>
      <button type="submit">Update password</button>
    </div>
  `;

  const { closePopup } = createPopupShell("Change Password", form);
  const currentPassword = form.querySelector("#currentPassword");
  const newPassword = form.querySelector("#newPassword");
  const confirmPassword = form.querySelector("#confirmPassword");

  form.querySelector(".secondary-action").addEventListener("click", closePopup);
  currentPassword.focus();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!newPassword.value.trim() || !confirmPassword.value.trim()) {
      alert("Enter and confirm a new password.");
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      alert("Passwords do not match.");
      return;
    }

    alert("Password change flow is ready for backend wiring.");
    closePopup();
  });
}

function openDeleteAccountPopup() {
  const content = document.createElement("div");
  content.className = "popup-stack";
  content.innerHTML = `
    <p class="popup-warning">This will permanently delete your account and remove your profile data.</p>
    <label for="deleteConfirm">Type DELETE to continue</label>
    <input id="deleteConfirm" type="text">
    <div class="popup-actions">
      <button type="button" class="secondary-action">Cancel</button>
      <button type="button" class="danger-action">Delete account</button>
    </div>
  `;

  const { closePopup } = createPopupShell("Delete Account", content);
  const deleteConfirm = content.querySelector("#deleteConfirm");

  content.querySelector(".secondary-action").addEventListener("click", closePopup);
  content.querySelector(".danger-action").addEventListener("click", () => {
    if (deleteConfirm.value.trim().toUpperCase() !== "DELETE") {
      alert("Type DELETE exactly to confirm.");
      return;
    }

    alert("Delete account flow is ready for backend wiring.");
    closePopup();
  });
  deleteConfirm.focus();
}

// Data

async function changeLanguage(userId, language) {
  const { error } = await supabase
    .from("profiles")
    .update({ Language: language })
    .eq("id", userId);

  if (error) {
    console.error("Error updating language:", error.message);
    alert("Failed to update language. Please try again.");
    return;
  }

  setLanguage(language);
  alert(`Language updated to ${language}.`);
}

// Events

changeLanguageButton?.addEventListener("click", async () => {
  await withLoadingOverlay(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("No user is currently logged in.");
      return;
    }

    await changeLanguage(user.id, languageDropdown.value);
  }, "Updating language...");
});
changePasswordButton?.addEventListener("click", openChangePasswordPopup);
deleteAccountButton?.addEventListener("click", openDeleteAccountPopup);

// Initialization

await withLoadingOverlay(getCurrentUserOrRedirect, "Loading settings...");
languageDropdown.value = getLanguage();
window.addEventListener("bloom:languagechange", (event) => {
  languageDropdown.value = event.detail.language;
});
