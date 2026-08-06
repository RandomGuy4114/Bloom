// Dependencies

import {
  createPopupShell,
  getUserLocation,
  PAGE_URLS,
  renderEmptyState,
  withLoadingOverlay,
} from "./main.js?v=mshhy216";
import { initializeBusinessNavigation, requireBusinessAccount } from "./business-common.js?v=mshhy216";
import { supabase } from "./supabase.js?v=mshhy216";

// Definitions

const welcomeHeading = document.getElementById("businessWelcome");
const tierStatus = document.getElementById("businessTierStatus");
const createButton = document.getElementById("createBusinessCommunity");
const connectButton = document.getElementById("connectBusinessPatreon");
const communityList = document.getElementById("businessCommunityList");
const businessPostForm = document.getElementById("businessPostForm");
const businessPostCommunity = document.getElementById("businessPostCommunity");
const businessCommunityImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
let account;

// Functions

async function loadBusinessAccount() {
  account = await requireBusinessAccount("display_name, username, isBusiness, business_location, business_latitude, business_longitude, patreon_user_id");
  if (!account) return;
  const { data: entitlement, error: entitlementError } = await supabase
    .from("profiles")
    .select("business_supporter")
    .eq("id", account.user.id)
    .single();
  if (entitlementError) {
    console.error("Unable to load Business Patreon status:", entitlementError.message);
  }
  account.profile.business_supporter = entitlement?.business_supporter === true;
  const { profile } = account;
  const businessName = profile.display_name || profile.username;
  if (businessName) {
    welcomeHeading.textContent = `Welcome, ${businessName}`;
    welcomeHeading.dataset.i18nIgnore = "true";
  }
  tierStatus.textContent = profile.business_supporter
    ? "Your Bloom Business Patreon membership is active."
    : "An active Bloom Business Patreon membership is required.";
  createButton.disabled = profile.business_supporter !== true;
  connectButton.hidden = profile.business_supporter === true;
  await loadBusinessCommunities();
}

async function loadBusinessCommunities() {
  const { data, error } = await supabase.from("Communities")
    .select("id, name, location_label, radius_meters")
    .eq("user_id", account.user.id).eq("business", true).order("created_at", { ascending: false });
  if (error) {
    console.error("Unable to load business communities:", error.message);
    renderEmptyState(communityList, "Business communities are temporarily unavailable.");
    businessPostForm.querySelector("button").disabled = true;
    return;
  }
  if (!data?.length) {
    renderEmptyState(communityList, "You have not created a business community yet.");
    businessPostForm.querySelector("button").disabled = true;
    return;
  }
  businessPostCommunity.replaceChildren(...data.map((community) => {
    const option = document.createElement("option");
    option.value = community.id;
    option.textContent = community.name;
    option.dataset.i18nIgnore = "true";
    return option;
  }));
  businessPostForm.querySelector("button").disabled = account.profile.business_supporter !== true;
  communityList.replaceChildren(...data.map((community) => {
    const link = document.createElement("a");
    link.className = "business-community-list-item";
    link.href = `${PAGE_URLS.community}?communityID=${encodeURIComponent(community.id)}`;
    const name = document.createElement("strong");
    name.textContent = community.name;
    name.dataset.i18nIgnore = "true";
    const tag = document.createElement("span");
    tag.className = "business-community-tag";
    tag.textContent = "Business";
    const detail = document.createElement("span");
    detail.textContent = `${community.location_label || "Custom location"} · ${(community.radius_meters / 1000).toLocaleString()} km`;
    detail.dataset.i18nIgnore = "true";
    link.append(name, tag, detail);
    return link;
  }));
}

function openBusinessCommunityForm() {
  const form = document.createElement("form");
  form.className = "popup-form";
  form.innerHTML = `
    <label for="businessCommunityName">Community name</label><input id="businessCommunityName" maxlength="100" required>
    <label for="businessCommunityDescription">Description</label><textarea id="businessCommunityDescription" maxlength="1000" required></textarea>
    <label for="businessCommunityImage">Community image</label><input id="businessCommunityImage" type="file" accept="image/jpeg,image/png,image/webp">
    <p class="community-image-help">Optional square image. JPEG, PNG, or WebP. Maximum 5 MB.</p>
    <label for="businessCommunityLocation">Location name or address</label><input id="businessCommunityLocation" maxlength="300">
    <div class="business-coordinate-grid"><div><label for="businessCommunityLatitude">Latitude</label><input id="businessCommunityLatitude" type="number" min="-90" max="90" step="any" required></div><div><label for="businessCommunityLongitude">Longitude</label><input id="businessCommunityLongitude" type="number" min="-180" max="180" step="any" required></div></div>
    <button id="useCommunityLocation" type="button" class="secondary-action">Use My Current Location</button>
    <label for="businessCommunityRadius">Promotion radius</label><input id="businessCommunityRadius" type="range" min="100" max="40000" step="100" value="5000"><output id="businessCommunityRadiusOutput">5 km</output>
    <button type="submit">Create Business Community</button>`;
  const { closePopup } = createPopupShell("Create Business Community", form);
  const latitude = form.querySelector("#businessCommunityLatitude");
  const longitude = form.querySelector("#businessCommunityLongitude");
  latitude.value = account.profile.business_latitude ?? "";
  longitude.value = account.profile.business_longitude ?? "";
  form.querySelector("#businessCommunityLocation").value = account.profile.business_location ?? "";
  const radius = form.querySelector("#businessCommunityRadius");
  const output = form.querySelector("#businessCommunityRadiusOutput");
  radius.addEventListener("input", () => { output.textContent = `${(Number(radius.value) / 1000).toLocaleString()} km`; });
  form.querySelector("#useCommunityLocation").addEventListener("click", async () => {
    const location = await getUserLocation();
    if (location) { latitude.value = location.latitude; longitude.value = location.longitude; }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    withLoadingOverlay(async () => {
      const imageFile = form.querySelector("#businessCommunityImage").files?.[0] ?? null;
      if (imageFile && (!businessCommunityImageTypes.has(imageFile.type) || imageFile.size > 5 * 1024 * 1024)) {
        alert("Choose a JPEG, PNG, or WebP community image that is 5 MB or smaller.");
        return;
      }
      const { data: communityId, error } = await supabase.rpc("create_business_community", {
        community_name: form.querySelector("#businessCommunityName").value.trim(),
        community_description: form.querySelector("#businessCommunityDescription").value.trim(),
        location_name: form.querySelector("#businessCommunityLocation").value.trim() || null,
        community_latitude: Number(latitude.value), community_longitude: Number(longitude.value),
        community_radius_meters: Number(radius.value),
      });
      if (error) { alert(error.message.includes("membership required") ? "An active Bloom Business Patreon membership is required." : "Unable to create the business community."); return; }
      if (imageFile) {
        const extension = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
        const path = `${account.user.id}/${communityId}/picture.${extension}`;
        const { error: uploadError } = await supabase.storage.from("Community Images").upload(path, imageFile, {
          contentType: imageFile.type,
          cacheControl: "3600",
          upsert: false,
        });
        if (!uploadError) {
          const { data: publicImage } = supabase.storage.from("Community Images").getPublicUrl(path);
          const { error: pictureError } = await supabase.rpc("set_community_picture", {
            target_community: communityId,
            new_picture_url: publicImage.publicUrl,
          });
          if (pictureError) await supabase.storage.from("Community Images").remove([path]);
        }
        if (uploadError) alert("The community was created, but its image could not be uploaded.");
      }
      closePopup();
      await loadBusinessCommunities();
    }, "Creating business community...");
  });
}

// Initialization

initializeBusinessNavigation();
createButton?.addEventListener("click", openBusinessCommunityForm);
connectButton?.addEventListener("click", () => withLoadingOverlay(async () => {
  const { data, error } = await supabase.functions.invoke("start-patreon-oauth");
  let destination = null;
  try { destination = data?.authorizationUrl ? new URL(data.authorizationUrl) : null; } catch { destination = null; }
  if (error || destination?.origin !== "https://www.patreon.com") { alert("Unable to connect Patreon."); return; }
  window.location.assign(destination.href);
}, "Connecting to Patreon..."));
businessPostForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  withLoadingOverlay(async () => {
    if (account.profile.business_supporter !== true) {
      alert("An active Bloom Business Patreon membership is required.");
      return;
    }
    const formData = new FormData();
    formData.append("title", document.getElementById("businessPostTitle").value.trim());
    formData.append("body", document.getElementById("businessPostBody").value.trim());
    formData.append("community", businessPostCommunity.value);
    formData.append("postType", "post");
    const { error } = await supabase.functions.invoke("create-post", { body: formData });
    if (error) { alert("Unable to publish the business post."); return; }
    businessPostForm.reset();
    alert("Business post published.");
  }, "Publishing your business post...");
});
await withLoadingOverlay(async () => {
  try {
    await loadBusinessAccount();
  } catch (error) {
    console.error("Unable to load business homepage:", error.message);
    tierStatus.textContent = "Unable to load the business account right now. Please refresh and try again.";
    createButton.disabled = true;
    connectButton.disabled = true;
    businessPostForm.querySelector("button").disabled = true;
  }
}, "Loading your business account...");
