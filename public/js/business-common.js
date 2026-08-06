// Dependencies

import { getCurrentUserOrRedirect, PAGE_URLS, showCurrentUser } from "./main.js?v=msggo3il";
import { supabase } from "./supabase.js?v=msggo3il";

// Definitions

const businessRoutes = new Set([
  "businessHome",
  "businessProfile",
  "businessSettings",
  "businessDashboard",
]);

// Functions

export async function requireBusinessAccount(select = "*") {
  const user = await getCurrentUserOrRedirect();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(select)
    .eq("id", user.id)
    .single();

  if (error) throw error;
  if (profile.isBusiness !== true) {
    window.location.replace(PAGE_URLS.home);
    return null;
  }

  await showCurrentUser(user, document.getElementById("username-label"), PAGE_URLS.businessProfile);
  return { user, profile };
}

export function initializeBusinessNavigation() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-business-route]");
    if (!button || !businessRoutes.has(button.dataset.businessRoute)) return;
    window.location.href = PAGE_URLS[button.dataset.businessRoute];
  });
}
