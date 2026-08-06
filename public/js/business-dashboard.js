// Dependencies

import { initializeBusinessNavigation, requireBusinessAccount } from "./business-common.js?v=mshhy216";
import { withLoadingOverlay } from "./main.js?v=mshhy216";

// Definitions

const completion = document.getElementById("profileCompletion");
const completionBar = document.getElementById("profileCompletionBar");
const contactCount = document.getElementById("contactMethodCount");
const locationStatus = document.getElementById("locationStatus");
const accountCreated = document.getElementById("accountCreated");
const recommendation = document.getElementById("dashboardRecommendation");

// Functions

function renderDashboard(profile) {
  const profileValues = [
    profile.display_name,
    profile.business_description,
    profile.business_location,
    profile.business_contact_email,
    profile.business_contact_phone,
    profile.business_website,
  ];
  const completed = profileValues.filter((value) => String(value ?? "").trim()).length;
  const percent = Math.round((completed / profileValues.length) * 100);
  const methods = [profile.business_contact_email, profile.business_contact_phone, profile.business_website]
    .filter(Boolean).length;
  const hasCoordinates = Number.isFinite(profile.business_latitude) && Number.isFinite(profile.business_longitude);

  completion.textContent = `${percent}%`;
  completionBar.value = percent;
  contactCount.textContent = String(methods);
  locationStatus.textContent = profile.business_location && hasCoordinates ? "Complete" : profile.business_location ? "Address added" : "Not added";
  accountCreated.textContent = profile.created_at ? `Created ${new Date(profile.created_at).toLocaleDateString()}` : "Active account";
  recommendation.textContent = percent === 100
    ? "Your business profile is complete. Keep it updated when your details change."
    : "Add the missing information so people can understand and contact your business.";
}

// Initialization

initializeBusinessNavigation();
await withLoadingOverlay(async () => {
  const account = await requireBusinessAccount([
    "isBusiness", "display_name", "created_at", "business_description", "business_location",
    "business_latitude", "business_longitude", "business_contact_email",
    "business_contact_phone", "business_website",
  ].join(", "));
  if (account) renderDashboard(account.profile);
}, "Loading business dashboard...");
