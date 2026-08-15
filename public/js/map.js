// Dependencies

import { supabase } from "./supabase.js?v=msurssz8";
import { t } from "./i18n.js?v=msurssz8";
import {
  canUserPostToCommunity,
  formatDateTime,
  getCurrentUserOrRedirect,
  getUserLocation,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js?v=msurssz8";

// Definitions

const usernameLabel = document.getElementById("username-label");
const eventList = document.getElementById("event-list");
const allowedPostImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

let currentUser;
let joinedCommunityIds = [];
let postableCommunityIds = new Set();
let map;
let eventMarkerLayer;
let locationMarker;
let selectedLocation;
let currentUserIsSupporter = false;
export let joinedCommunityEvents = [];

// Components

function createEventComposer() {
  eventList.innerHTML = `
    <form id="eventComposer" class="event-composer">
      <div class="event-composer-heading">
        <p class="post-type-badge post-type-badge--event"><span class="post-type-icon" aria-hidden="true">📅</span><span>Event</span></p>
        <h2>Create Event</h2>
        <p>Choose a community, then click the map where the event will happen.</p>
      </div>
      <label for="eventCommunitySelect">Community</label>
      <select id="eventCommunitySelect" aria-label="Event community"></select>
      <label for="eventTitleInput">Event title</label>
      <input id="eventTitleInput" type="text" placeholder="Event title" maxlength="200" required>
      <label for="eventBodyInput">Event description</label>
      <textarea id="eventBodyInput" placeholder="Describe the event" maxlength="10000" required></textarea>
      <label for="eventDateInput">Event date</label>
      <input id="eventDateInput" type="date" required>
      <div class="event-map-instruction" id="eventMapInstruction">
        <strong>Select a location</strong>
        <span>Tap or click anywhere on the map. You can drag the marker to adjust it.</span>
      </div>
      <output id="selectedEventLocation" class="selected-event-location" aria-live="polite">No location selected</output>
      <input type="file" id="eventImageInput" class="post-image-input" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Add images" multiple>
      <p id="eventImageLimitHint" class="composer-help"></p>
      <div id="eventImagePreview" class="post-image-preview" hidden></div>
      <div class="event-composer-actions">
        <button type="button" id="eventImageButton" class="event-image-button" aria-label="Add image" title="Add image"><span aria-hidden="true">📎</span><span>Add image</span></button>
        <button type="submit" id="createEventButton">Create event</button>
      </div>
    </form>
  `;

  document.getElementById("eventComposer").addEventListener("submit", createEvent);
  document.getElementById("eventDateInput").min = getLocalDateValue(new Date());
  document.getElementById("eventImageButton").addEventListener("click", () => {
    document.getElementById("eventImageInput").click();
  });
  document.getElementById("eventImageInput").addEventListener("change", showEventImagePreview);
}

async function populateCommunitySelect() {
  const select = document.getElementById("eventCommunitySelect");
  select.replaceChildren();
  postableCommunityIds = new Set();

  if (!joinedCommunityIds.length) {
    const option = document.createElement("option");
    option.textContent = "Join a community to create an event";
    option.value = "";
    select.appendChild(option);
    setComposerDisabled(true);
    return;
  }

  const { data: communities, error } = await supabase
    .from("Communities")
    .select("id, name, global")
    .in("id", joinedCommunityIds)
    .order("name");

  if (error) {
    console.error("Error loading event communities:", error.message);
    const option = document.createElement("option");
    option.textContent = "Unable to load communities";
    option.value = "";
    select.appendChild(option);
    setComposerDisabled(true);
    return;
  }

  const isAdmin = currentUser?.app_metadata?.role === "admin";
  const communitiesUserCanPostTo = (communities ?? []).filter(({ global }) => !global || isAdmin);
  postableCommunityIds = new Set(communitiesUserCanPostTo.map(({ id }) => String(id)));

  if (!communitiesUserCanPostTo.length) {
    const option = document.createElement("option");
    option.textContent = "Only administrators can post in global communities";
    option.value = "";
    select.appendChild(option);
    setComposerDisabled(true);
    return;
  }

  const options = communitiesUserCanPostTo.map(({ id, name }) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    option.dataset.i18nIgnore = "true";
    return option;
  });
  select.replaceChildren(...options);
  setComposerDisabled(false);
}

function setComposerDisabled(disabled) {
  [
    "eventCommunitySelect",
    "eventTitleInput",
    "eventBodyInput",
    "eventDateInput",
    "eventImageInput",
    "eventImageButton",
    "createEventButton",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.disabled = disabled;
    }
  });
}

function initializeMap(userLocation) {
  const startingPoint = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [0, 0];
  const startingZoom = userLocation ? 14 : 2;

  map = L.map("map").setView(startingPoint, startingZoom);
  map.getContainer().setAttribute("aria-label", t("Event location map"));
  map.getContainer().setAttribute("aria-describedby", "eventMapInstruction");

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  eventMarkerLayer = L.layerGroup().addTo(map);
  map.on("click", ({ latlng }) => selectEventLocation(latlng.lat, latlng.lng));
  return map;
}

function selectEventLocation(latitude, longitude) {
  selectedLocation = { latitude, longitude };

  if (!locationMarker) {
    locationMarker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
    locationMarker.bindTooltip(t("Selected event location"), { direction: "top" });
    locationMarker.on("dragend", () => {
      const position = locationMarker.getLatLng();
      selectEventLocation(position.lat, position.lng);
    });
  } else {
    locationMarker.setLatLng([latitude, longitude]);
  }

  document.getElementById("selectedEventLocation").textContent =
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function renderEventMarkers(events) {
  eventMarkerLayer.clearLayers();

  events.forEach((event) => {
    const location = parseEventLocation(event.location);
    if (!location) {
      return;
    }

    const marker = L.marker([location.latitude, location.longitude]);
    const popup = document.createElement("div");
    popup.className = "event-map-popup";

    const title = document.createElement("strong");
    title.textContent = event.title || "Event";
    popup.appendChild(title);

    if (event.body) {
      const body = document.createElement("p");
      body.textContent = event.body;
      popup.appendChild(body);
    }

    const eventDate = document.createElement("small");
    eventDate.textContent = event.date
      ? `${t("Event date:")} ${formatDateTime(`${event.date}T00:00:00`)}`
      : `Posted on ${formatDateTime(event.created_at)}`;
    popup.appendChild(eventDate);
    marker.bindPopup(popup);
    eventMarkerLayer.addLayer(marker);
  });
}

function parseEventLocation(value) {
  let latitude;
  let longitude;

  if (typeof value === "string") {
    [latitude, longitude] = value.split(",").map(Number);
  } else if (Array.isArray(value)) {
    [latitude, longitude] = value.map(Number);
  } else if (value && typeof value === "object") {
    latitude = Number(value.latitude ?? value.lat);
    longitude = Number(value.longitude ?? value.lng ?? value.lon);
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

function showEventImagePreview() {
  const input = document.getElementById("eventImageInput");
  const preview = document.getElementById("eventImagePreview");
  const files = [...(input.files ?? [])];
  preview.replaceChildren();
  preview.hidden = !files.length;

  if (!files.length) {
    return;
  }
  files.forEach((file, index) => {
    const image = document.createElement("img");
    const previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.alt = `Event image preview ${index + 1}`;
    image.addEventListener("load", () => URL.revokeObjectURL(previewUrl), { once: true });
    preview.appendChild(image);
  });
}

function resetEventComposer() {
  document.getElementById("eventTitleInput").value = "";
  document.getElementById("eventBodyInput").value = "";
  document.getElementById("eventDateInput").value = "";
  document.getElementById("eventImageInput").value = "";
  document.getElementById("eventImagePreview").replaceChildren();
  document.getElementById("eventImagePreview").hidden = true;
  document.getElementById("selectedEventLocation").textContent = "No location selected";
  selectedLocation = null;
  if (locationMarker) {
    map.removeLayer(locationMarker);
    locationMarker = null;
  }
}

function getLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Data

async function loadJoinedCommunityIds(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("joined_communities, supporter")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error loading joined communities:", error.message);
    return [];
  }

  if (currentUser?.id === userId) {
    currentUserIsSupporter = profile?.supporter === true;
    const hint = document.getElementById("eventImageLimitHint");
    if (hint) {
      hint.textContent = currentUserIsSupporter
        ? "Supporter: up to 5 images, 25 MB each."
        : "Up to 1 image, 10 MB.";
    }
  }
  return [...new Set(profile?.joined_communities ?? [])].filter(Boolean);
}

export async function getJoinedCommunityEvents(userId, communityIds = null) {
  const ids = communityIds ?? await loadJoinedCommunityIds(userId);
  if (!userId || !ids.length) {
    return [];
  }

  const { data: unorderedEvents, error } = await supabase
    .rpc("get_visible_posts", { community_ids: ids, post_types: ["event"] });
  const events = (unorderedEvents ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (error) {
    console.error("Error loading joined-community events:", error.message);
    return [];
  }

  return events ?? [];
}

async function createEvent(event) {
  event.preventDefault();

  const community = document.getElementById("eventCommunitySelect").value;
  const title = document.getElementById("eventTitleInput").value.trim();
  const body = document.getElementById("eventBodyInput").value.trim();
  const date = document.getElementById("eventDateInput").value;
  const imageFiles = [...(document.getElementById("eventImageInput").files ?? [])];
  const imageLimit = currentUserIsSupporter ? 5 : 1;
  const maximumPostImageSize = (currentUserIsSupporter ? 25 : 10) * 1024 * 1024;

  if (!title) {
    alert("Please add an event title before publishing.");
    return;
  }
  if (!body) {
    alert("Please describe the event before publishing.");
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    alert("Please choose a valid event date.");
    return;
  }
  if (date < getLocalDateValue(new Date())) {
    alert("The event date cannot be in the past.");
    return;
  }
  if (!community || !postableCommunityIds.has(String(community))) {
    alert("Please choose a community where you can create events.");
    return;
  }
  if (!selectedLocation) {
    alert("Choose a location by clicking the map.");
    return;
  }
  if (imageFiles.length > imageLimit) {
    alert(`You can upload up to ${imageLimit} image${imageLimit === 1 ? "" : "s"} per post.`);
    return;
  }
  if (imageFiles.some((file) => !allowedPostImageTypes.has(file.type))) {
    alert("Choose a JPEG, PNG, WebP, or GIF image.");
    return;
  }
  if (imageFiles.some((file) => file.size > maximumPostImageSize)) {
    alert(`Each post image must be ${currentUserIsSupporter ? 25 : 10} MB or smaller.`);
    return;
  }

  await withLoadingOverlay(async () => {
    const { allowed, error: accessError } = await canUserPostToCommunity(currentUser.id, community);
    if (accessError) {
      alert("Unable to verify posting access. Please try again.");
      return;
    }
    if (!allowed) {
      alert("Only administrators can create posts in global communities.");
      return;
    }

    const location = `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("body", body);
    formData.append("community", community);
    formData.append("postType", "event");
    formData.append("location", location);
    formData.append("date", date);
    imageFiles.forEach((file) => formData.append("images", file));
    const { error } = await supabase.functions.invoke("create-post", { body: formData });

    if (error) {
      console.error("Error creating event:", error.message);
      alert("The event could not be published. Check that its text and images follow the community guidelines, then try again.");
      return;
    }

    resetEventComposer();
    joinedCommunityEvents = await getJoinedCommunityEvents(currentUser.id, joinedCommunityIds);
    renderEventMarkers(joinedCommunityEvents);
    alert("Event created successfully.");
  }, "Publishing your event...");
}

// Initialization

await withLoadingOverlay(async () => {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) {
    return;
  }

  createEventComposer();
  const [userLocation, communityIds] = await Promise.all([
    getUserLocation(),
    loadJoinedCommunityIds(currentUser.id),
    showCurrentUser(currentUser, usernameLabel),
  ]);

  joinedCommunityIds = communityIds;
  initializeMap(userLocation);
  await populateCommunitySelect();
  joinedCommunityEvents = await getJoinedCommunityEvents(currentUser.id, joinedCommunityIds);
  renderEventMarkers(joinedCommunityEvents);
}, "Loading map...");

// Events

window.addEventListener("bloom:languagechange", () => {
  map?.getContainer().setAttribute("aria-label", t("Event location map"));
  if (locationMarker?.getTooltip()) {
    locationMarker.setTooltipContent(t("Selected event location"));
  }
});
