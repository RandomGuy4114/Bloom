// Dependencies

import {
  applyTheme,
  createPopupShell,
  getAvailableThemes,
  getCurrentUserOrRedirect,
  PAGE_URLS,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js?v=msx5ymzr";
import { getLanguage, setLanguage } from "./i18n.js?v=msx5ymzr";
import { supabase } from "./supabase.js?v=msx5ymzr";
import { setConnectEnabled } from "./connect.js?v=msx5ymzr";

// Definitions

const changePasswordButton = document.getElementById("changePasswordButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const changeLanguageButton = document.getElementById("changeLangButton");
const languageDropdown = document.getElementById("LangDropdown");
const logoutButton = document.getElementById("logoutButton");
const themeDropdown = document.getElementById("ThemeDropdown");
const changeThemeButton = document.getElementById("changeThemeButton");
const themeSupporterHint = document.getElementById("themeSupporterHint");
const earlyAccessButton = document.getElementById("earlyAccessButton");
const connectEnabledToggle = document.getElementById("connectEnabledToggle");
const connectStatus = document.getElementById("connectStatus");

let currentUser;
let currentProfile;

// Dialogs

function openChangePasswordPopup() {
  const form = document.createElement("form");
  form.className = "popup-form";
  form.innerHTML = `
    <label for="currentPassword">Current password</label>
    <input id="currentPassword" type="password" autocomplete="current-password" placeholder="Current password">
    <label for="newPassword">New password</label>
    <input id="newPassword" type="password" autocomplete="new-password" placeholder="New password">
    <label for="confirmPassword">Confirm new password</label>
    <input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Confirm new password">
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
    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      alert("Enter and confirm a new password.");
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      alert("Passwords do not match.");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword.value)) {
      alert("Use at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }

    withLoadingOverlay(async () => {
      if (!currentUser?.email) {
        alert("Unable to verify your account. Please sign in again.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword.value,
      });
      if (signInError) {
        alert("Your current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword.value,
      });

      if (updateError) {
        console.error("Error updating password:", updateError.message);
        alert("Failed to update password. Please try again.");
        return;
      }

      alert("Password updated successfully.");
      closePopup();
    }, "Updating password...");
  });
}

async function openDeleteAccountPopup() {
  const content = document.createElement("div");
  content.className = "popup-stack";
  content.innerHTML = `
    <p class="popup-warning">This will permanently delete your account and remove your profile data.</p>
    <label for="deleteConfirm">Type DELETE to continue</label>
    <input id="deleteConfirm" type="text" placeholder="Type DELETE">
    <div class="popup-actions">
      <button type="button" class="secondary-action">Cancel</button>
      <button type="button" class="danger-action">Delete account</button>
    </div>
  `;

  const { closePopup } = createPopupShell("Delete Account", content);
  const deleteConfirm = content.querySelector("#deleteConfirm");

  content.querySelector(".secondary-action").addEventListener("click", closePopup);
  content.querySelector(".danger-action").addEventListener("click", async () => {
    if (deleteConfirm.value.trim().toUpperCase() !== "DELETE") {
      alert("Type DELETE exactly to confirm.");
      return;
    }

    await withLoadingOverlay(async () => {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation: "DELETE" },
      });
      if (error || data?.deleted !== true) {
        console.error("Error deleting account:", error?.message || data?.error);
        alert(data?.error || "Failed to delete account. Please try again.");
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      window.location.href = PAGE_URLS.index;
    }, "Deleting account...");
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

function populateThemes() {
  const supporter = currentProfile?.supporter === true;
  const labels = {
    light: "Light",
    dark: "Dark",
    forest: "Forest",
    midnight: "Midnight",
    sunset: "Sunset",
    "frutiger-aero": "Frutiger Aero"
  };
  const options = getAvailableThemes(supporter).map((theme) => {
    const option = document.createElement("option");
    option.value = theme;
    option.textContent = labels[theme];
    return option;
  });
  themeDropdown.replaceChildren(...options);
  themeDropdown.value = applyTheme(currentProfile?.Theme, supporter);
  themeSupporterHint.textContent = supporter
    ? "Supporter themes are unlocked."
    : "Forest, Midnight, Frutiger Aero, and Sunset themes are available with Supporter.";
}

async function changeTheme() {
  const selectedTheme = themeDropdown.value;
  const { error } = await supabase
    .from("profiles")
    .update({ Theme: selectedTheme })
    .eq("id", currentUser.id);
  if (error) {
    console.error("Error updating theme:", error.message);
    alert("Unable to update theme. Please try again.");
    return;
  }
  currentProfile.Theme = selectedTheme;
  applyTheme(selectedTheme, currentProfile.supporter === true);
}

// Events

logoutButton?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error.message);
    alert("Failed to sign out. Please try again.");
    return;
  }
  window.location.href = PAGE_URLS.index;
});

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
changeThemeButton?.addEventListener("click", () => withLoadingOverlay(changeTheme, "Updating theme..."));
earlyAccessButton?.addEventListener("click", () => {
  window.location.href = PAGE_URLS.earlyAccess;
});
connectEnabledToggle?.addEventListener("change", async () => {
  const enabled = connectEnabledToggle.checked;
  connectEnabledToggle.disabled = true;
  connectStatus.textContent = enabled ? "Enabling Connect..." : "Turning Connect off...";
  try {
    await setConnectEnabled(currentUser, enabled);
    currentProfile.connect_enabled = enabled;
    connectStatus.textContent = enabled
      ? "Connect is on. Bloom may use your location in the background."
      : "Connect is off and your stored location was deleted.";
  } catch (error) {
    console.error("Unable to update Connect:", error.message);
    connectEnabledToggle.checked = !enabled;
    connectStatus.textContent = error.message || "Unable to update Connect.";
  } finally {
    connectEnabledToggle.disabled = false;
  }
});

// Initialization


await withLoadingOverlay(async () => {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) {
    return;
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("Theme, supporter, connect_enabled")
    .eq("id", currentUser.id)
    .single();
  if (profileError) {
    console.error("Unable to load appearance settings:", profileError.message);
  }
  currentProfile = profile ?? { Theme: "light", supporter: false, connect_enabled: false };
  const usernameLabel = document.getElementById("username-label");
  await showCurrentUser(currentUser, usernameLabel);
  populateThemes();
  connectEnabledToggle.checked = currentProfile.connect_enabled === true;
  connectStatus.textContent = connectEnabledToggle.checked
    ? "Connect is on. Bloom may use your location in the background."
    : "Connect is off.";
}, "Loading settings...");
languageDropdown.value = getLanguage();
window.addEventListener("bloom:languagechange", (event) => {
  languageDropdown.value = event.detail.language;
});
