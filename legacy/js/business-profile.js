// Dependencies

import { initializeBusinessNavigation, requireBusinessAccount } from "./business-common.js";
import { withLoadingOverlay } from "./main.js";
import { supabase } from "./supabase.js";

// Definitions

const form = document.getElementById("businessProfileForm");
const message = document.getElementById("businessProfileMessage");
const fields = {
  display_name: document.getElementById("businessName"),
  business_description: document.getElementById("businessDescription"),
  business_location: document.getElementById("businessLocation"),
  business_latitude: document.getElementById("businessLatitude"),
  business_longitude: document.getElementById("businessLongitude"),
  business_contact_email: document.getElementById("businessEmail"),
  business_contact_phone: document.getElementById("businessPhone"),
  business_website: document.getElementById("businessWebsite"),
};

// Functions

function optionalValue(input) {
  const value = input.value.trim();
  return value || null;
}

function coordinateValue(input) {
  return input.value === "" ? null : Number(input.value);
}

function populateForm(profile) {
  Object.entries(fields).forEach(([key, input]) => {
    input.value = profile[key] ?? "";
  });
}

async function saveProfile() {
  if (!form.reportValidity()) return;
  const latitude = coordinateValue(fields.business_latitude);
  const longitude = coordinateValue(fields.business_longitude);
  if ((latitude === null) !== (longitude === null)) {
    message.textContent = "Enter both latitude and longitude, or leave both empty.";
    return;
  }

  const updates = {
    display_name: fields.display_name.value.trim(),
    business_description: optionalValue(fields.business_description),
    business_location: optionalValue(fields.business_location),
    business_latitude: latitude,
    business_longitude: longitude,
    business_contact_email: optionalValue(fields.business_contact_email),
    business_contact_phone: optionalValue(fields.business_contact_phone),
    business_website: optionalValue(fields.business_website),
  };
  const { error } = await supabase.rpc("update_business_profile", {
    business_name: updates.display_name,
    description: updates.business_description,
    location_text: updates.business_location,
    latitude: updates.business_latitude,
    longitude: updates.business_longitude,
    contact_email: updates.business_contact_email,
    contact_phone: updates.business_contact_phone,
    website: updates.business_website,
  });
  if (error) throw error;
  message.textContent = "Business profile saved.";
}

// Events

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";
  withLoadingOverlay(async () => {
    try {
      await saveProfile();
    } catch (error) {
      console.error("Unable to save business profile:", error.message);
      message.textContent = "Unable to save your business profile. Please try again.";
    }
  }, "Saving your business profile...");
});

document.getElementById("useBusinessLocation")?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    message.textContent = "Location is not available in this browser.";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      fields.business_latitude.value = coords.latitude.toFixed(6);
      fields.business_longitude.value = coords.longitude.toFixed(6);
      message.textContent = "Current coordinates added. Add an address if you want it displayed.";
    },
    () => { message.textContent = "Bloom could not access your location."; },
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

// Initialization

initializeBusinessNavigation();
await withLoadingOverlay(async () => {
  try {
    const account = await requireBusinessAccount([
      "isBusiness", "display_name", "business_description", "business_location",
      "business_latitude", "business_longitude", "business_contact_email",
      "business_contact_phone", "business_website",
    ].join(", "));
    if (!account) return;
    populateForm(account.profile);
  } catch (error) {
    console.error("Unable to load business profile:", error.message);
    message.textContent = "Unable to load your business profile.";
  }
}, "Loading your business profile...");
