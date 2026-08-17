// Dependencies

import { initializeBusinessNavigation, requireBusinessAccount } from "./business-common.js?v=msx4sye2";
import { applyTheme, getAvailableThemes, PAGE_URLS, withLoadingOverlay } from "./main.js?v=msx4sye2";
import { getLanguage, setLanguage } from "./i18n.js?v=msx4sye2";
import { supabase } from "./supabase.js?v=msx4sye2";

// Definitions

const themeSelect = document.getElementById("businessTheme");
const languageSelect = document.getElementById("businessLanguage");
const message = document.getElementById("businessSettingsMessage");
let account;

// Functions

function populateThemes(profile) {
  getAvailableThemes(profile.supporter === true).forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme;
    option.textContent = theme[0].toUpperCase() + theme.slice(1);
    themeSelect.append(option);
  });
  themeSelect.value = applyTheme(profile.Theme, profile.supporter === true);
}

// Events

document.getElementById("saveBusinessTheme")?.addEventListener("click", () => withLoadingOverlay(async () => {
  const { error } = await supabase.from("profiles").update({ Theme: themeSelect.value }).eq("id", account.user.id);
  if (error) throw error;
  applyTheme(themeSelect.value, account.profile.supporter === true);
  message.textContent = "Theme updated.";
}, "Updating theme..."));

document.getElementById("saveBusinessLanguage")?.addEventListener("click", () => withLoadingOverlay(async () => {
  const language = languageSelect.value;
  const { error } = await supabase.from("profiles").update({ Language: language }).eq("id", account.user.id);
  if (error) throw error;
  setLanguage(language);
  message.textContent = "Language updated.";
}, "Updating language..."));

document.getElementById("businessLogout")?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) window.location.href = PAGE_URLS.index;
});

// Initialization

initializeBusinessNavigation();
await withLoadingOverlay(async () => {
  account = await requireBusinessAccount("isBusiness, Theme, Language, supporter");
  if (!account) return;
  populateThemes(account.profile);
  languageSelect.value = account.profile.Language || getLanguage();
}, "Loading business settings...");
