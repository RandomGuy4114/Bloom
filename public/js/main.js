// Dependencies

import { supabase } from "./supabase.js?v=msgbwtsa";
import { getLanguage, setLanguage, t } from "./i18n.js?v=msgbwtsa";

// Definitions

const communityNameCache = new Map();
const userProfileCache = new Map();
let loadingOverlay;
let loadingRequestCount = 0;
let previousBodyOverflow = "";
let openPostMenu;
let globalSearchInitialized = false;
let globalSearchLocation;
let globalSearchLocationRequested = false;
let globalSearchLocationResolved = false;
let globalSearchRequestSequence = 0;

export const PAGE_URLS = Object.freeze({
  index: new URL("../", import.meta.url).href,
  login: new URL("../pages/auth/login/", import.meta.url).href,
  home: new URL("../pages/app/home/", import.meta.url).href,
  createPost: new URL("../pages/app/create-post/", import.meta.url).href,
  connect: new URL("../pages/app/connect/", import.meta.url).href,
  businessHome: new URL("../pages/business/home/", import.meta.url).href,
  businessProfile: new URL("../pages/business/profile/", import.meta.url).href,
  businessSettings: new URL("../pages/business/settings/", import.meta.url).href,
  businessDashboard: new URL("../pages/business/dashboard/", import.meta.url).href,
  profile: new URL("../pages/app/profile/", import.meta.url).href,
  calendar: new URL("../pages/app/calendar/", import.meta.url).href,
  map: new URL("../pages/app/map/", import.meta.url).href,
  settings: new URL("../pages/app/settings/", import.meta.url).href,
  supporter: new URL("../pages/app/supporter/", import.meta.url).href,
  earlyAccess: new URL("../pages/app/early-access/", import.meta.url).href,
  post: new URL("../pages/app/post/", import.meta.url).href,
  editPost: new URL("../pages/app/edit-post/", import.meta.url).href,
  communities: new URL("../pages/communities/communities/", import.meta.url).href,
  community: new URL("../pages/communities/community/", import.meta.url).href,
});

// Authentication

export async function getCurrentUserOrRedirect(redirectUrl = PAGE_URLS.login) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Error fetching user:", error?.message ?? "No user session found.");
    window.location.href = redirectUrl;
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("Language, Theme, supporter")
    .eq("id", user.id)
    .single();
  if (profile?.Language) {
    setLanguage(profile.Language);
  }
  applyTheme(profile?.Theme, profile?.supporter === true);
  initializeGlobalSearch();
  import("./connect.js?v=msgbwtsa")
    .then(({ restoreConnect }) => restoreConnect(user))
    .catch((error) => console.error("Unable to restore Connect:", error.message));

  return user;
}

// Global Search

function createGlobalSearchResult({ href, title, description, badge }) {
  const link = document.createElement("a");
  link.className = "global-search-result";
  link.href = href;

  const copy = document.createElement("span");
  copy.className = "global-search-result-copy";
  copy.dataset.i18nIgnore = "true";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const detail = document.createElement("span");
  detail.textContent = description;
  copy.append(heading, detail);

  const typeBadge = document.createElement("span");
  typeBadge.className = "global-search-result-badge";
  typeBadge.textContent = t(badge);
  link.append(copy, typeBadge);
  return link;
}

function createGlobalSearchGroup(title, results) {
  if (!results.length) return null;
  const section = document.createElement("section");
  section.className = "global-search-group";
  const heading = document.createElement("h2");
  heading.textContent = t(title);
  section.append(heading, ...results);
  return section;
}

function renderGlobalSearchResults(panel, results, locationUnavailable = false) {
  const userLinks = (results?.users ?? []).map((profile) => createGlobalSearchResult({
    href: `${PAGE_URLS.profile}?uid=${encodeURIComponent(profile.id)}`,
    title: profile.display_name || profile.username,
    description: `@${profile.username}`,
    badge: "User",
  }));
  const communityLinks = (results?.communities ?? []).map((community) => createGlobalSearchResult({
    href: `${PAGE_URLS.community}?communityID=${encodeURIComponent(community.id)}`,
    title: community.name,
    description: community.description || t("Open community"),
    badge: community.scope === "joined" ? "Joined" : community.scope === "global" ? "Global" : "Nearby",
  }));
  const postLinks = (results?.posts ?? []).map((post) => createGlobalSearchResult({
    href: `${PAGE_URLS.post}?postId=${encodeURIComponent(post.id)}`,
    title: post.title,
    description: post.community_name ? `${post.body} · ${t("in")} ${post.community_name}` : post.body,
    badge: post.post_type === "activity" ? "Activity" : post.post_type === "event" ? "Event" : "Post",
  }));
  const groups = [
    createGlobalSearchGroup("Users", userLinks),
    createGlobalSearchGroup("Communities", communityLinks),
    createGlobalSearchGroup("Posts", postLinks),
  ].filter(Boolean);

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "global-search-message";
    empty.textContent = t("No results found.");
    panel.replaceChildren(empty);
    return;
  }

  panel.replaceChildren(...groups);
  if (locationUnavailable) {
    const locationHint = document.createElement("p");
    locationHint.className = "global-search-location-hint";
    locationHint.textContent = t("Location access is off, so nearby communities are not included.");
    panel.appendChild(locationHint);
  }
}

async function searchBloom(query, panel, input, location = globalSearchLocation) {
  const requestSequence = ++globalSearchRequestSequence;
  panel.setAttribute("aria-busy", "true");
  const { data, error } = await supabase.rpc("search_bloom", {
    search_term: query,
    user_latitude: location?.latitude ?? null,
    user_longitude: location?.longitude ?? null,
    result_limit: 6,
  });
  if (requestSequence !== globalSearchRequestSequence || input.value.trim() !== query) return;
  panel.setAttribute("aria-busy", "false");
  if (error) {
    console.error("Unable to search Bloom:", error.message);
    const message = document.createElement("p");
    message.className = "global-search-message";
    message.textContent = t("Search is temporarily unavailable.");
    panel.replaceChildren(message);
    return;
  }
  renderGlobalSearchResults(panel, data, globalSearchLocationResolved && !globalSearchLocation);
}

function requestGlobalSearchLocation(panel, input) {
  if (globalSearchLocationRequested) return;
  globalSearchLocationRequested = true;
  getUserLocation().then((location) => {
    globalSearchLocation = location;
    globalSearchLocationResolved = true;
    const currentQuery = input.value.trim();
    if (currentQuery.length >= 2) searchBloom(currentQuery, panel, input, location);
  });
}

function initializeGlobalSearch() {
  if (globalSearchInitialized) return;
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  globalSearchInitialized = true;

  const container = document.createElement("div");
  container.className = "global-search";
  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.htmlFor = "globalSearchInput";
  label.textContent = "Search Bloom";
  const input = document.createElement("input");
  input.id = "globalSearchInput";
  input.type = "search";
  input.placeholder = "Search users, communities, and posts";
  input.autocomplete = "off";
  input.maxLength = 100;
  input.setAttribute("aria-label", "Search Bloom");
  input.setAttribute("aria-controls", "globalSearchResults");
  input.setAttribute("aria-expanded", "false");
  const panel = document.createElement("div");
  panel.id = "globalSearchResults";
  panel.className = "global-search-results";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Search results");
  panel.setAttribute("aria-live", "polite");
  panel.hidden = true;
  container.append(label, input, panel);
  topbar.insertBefore(container, topbar.querySelector("nav"));

  let debounceTimer;
  const closeResults = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  };
  const openResults = () => {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      globalSearchRequestSequence++;
      closeResults();
      panel.replaceChildren();
      return;
    }
    openResults();
    const loading = document.createElement("p");
    loading.className = "global-search-message";
    loading.textContent = t("Searching...");
    panel.replaceChildren(loading);
    debounceTimer = window.setTimeout(() => {
      searchBloom(query, panel, input);
      requestGlobalSearchLocation(panel, input);
    }, 250);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2 && panel.childElementCount) openResults();
  });
  input.addEventListener("keydown", (event) => {
    const links = [...panel.querySelectorAll(".global-search-result")];
    if (event.key === "Escape") {
      closeResults();
      input.blur();
    } else if (event.key === "ArrowDown" && links.length) {
      event.preventDefault();
      links[0].focus();
    }
  });
  panel.addEventListener("keydown", (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Escape'].includes(event.key)) return;
    const links = [...panel.querySelectorAll(".global-search-result")];
    const index = links.indexOf(document.activeElement);
    event.preventDefault();
    if (event.key === "Escape") {
      closeResults();
      input.focus();
    } else if (event.key === "ArrowDown") {
      (links[index + 1] ?? links[0])?.focus();
    } else {
      (links[index - 1] ?? links.at(-1))?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) closeResults();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      input.focus();
    }
  });
  window.addEventListener("bloom:languagechange", () => {
    const query = input.value.trim();
    if (query.length >= 2) searchBloom(query, panel, input);
  });
}

export async function getCurrentUsername() {
  const user = await getCurrentUserOrRedirect();
  if (!user) {
    return null;
  }

  return (await getUserProfile(user.id))?.username ?? null;
}

// Data

export async function getUserProfile(userId) {
  if (!userId) {
    return null;
  }

  if (!userProfileCache.has(userId)) {
    const request = supabase
      .rpc("get_public_profile", { target_user: userId })
      .maybeSingle()
      .then(({ data: profile, error }) => {
        if (error) {
          userProfileCache.delete(userId);
          console.error("Error fetching user profile:", error.message);
          return null;
        }

        return profile;
      });

    userProfileCache.set(userId, request);
  }

  return userProfileCache.get(userId);
}

export function clearUserProfileCache(userId) {
  userProfileCache.delete(userId);
}

export function isSupporter(profile) {
  return profile?.supporter === true;
}

export async function userHasSupporter(userId) {
  return isSupporter(await getUserProfile(userId));
}

export function createSupporterBadge({ compact = false } = {}, text = 'Supporter', color = '#FFD700') {
  const badge = document.createElement("span");
  badge.className = `supporter-badge${compact ? " supporter-badge--compact" : ""}`;
  badge.setAttribute("aria-label", `Bloom ${text}`);
  badge.title = text;

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
   icon.textContent = text === "Supporter" ? "★" : text === "Owner" ? "👑" : "🌟";
  badge.appendChild(icon);

  if (!compact) {
    const label = document.createElement("span");
    label.textContent = text;
    badge.appendChild(label);
  }

  return badge;
}

export const STANDARD_THEMES = Object.freeze(["light", "dark"]);
export const SUPPORTER_THEMES = Object.freeze(["forest", "midnight", "sunset", "frutiger-aero"]);

export function getAvailableThemes(supporter = false) {
  return supporter ? [...STANDARD_THEMES, ...SUPPORTER_THEMES] : [...STANDARD_THEMES];
}

export function applyTheme(theme = "light", supporter = false) {
  const selectedTheme = getAvailableThemes(supporter).includes(theme) ? theme : "light";
  const darkTheme = selectedTheme === "dark" || selectedTheme === "midnight";
  document.documentElement.dataset.themeName = selectedTheme;
  if (document.body) {
    document.body.dataset.theme = darkTheme ? "dark" : "light";
    document.body.dataset.themeName = selectedTheme;
  }
  return selectedTheme;
}

export async function getCommunityNameFromID(communityID) {
  if (!communityID) {
    return null;
  }

  if (!communityNameCache.has(communityID)) {
    const request = supabase
      .from("Communities")
      .select("name")
      .eq("id", communityID)
      .single()
      .then(({ data: community, error }) => {
        if (error) {
          communityNameCache.delete(communityID);
          console.error("Error fetching community name:", error.message);
          return null;
        }

        return community.name;
      });

    communityNameCache.set(communityID, request);
  }

  return communityNameCache.get(communityID);
}

export function addUniqueItem(items = [], item) {
  const list = Array.isArray(items) ? items : [];
  return list.includes(item) ? list : [...list, item];
}

export function removeItem(items = [], item) {
  return Array.isArray(items) ? items.filter((value) => value !== item) : [];
}

export function isPostOwner(post, userId) {
  return Boolean(userId) && (post?.user_id === userId || post?.author === userId);
}

export async function canUserPostToCommunity(userId, communityID) {
  const [
    { data: community, error: communityError },
    { data: { user: currentUser }, error: userError },
  ] = await Promise.all([
    supabase
      .from("Communities")
      .select("global")
      .eq("id", communityID)
      .single(),
    supabase.auth.getUser(),
  ]);

  const error = communityError ?? userError;
  if (error) {
    console.error("Error checking global community posting access:", error.message);
    return { allowed: false, error };
  }

  return {
    allowed: Boolean(currentUser)
      && currentUser.id === userId
      && (!community.global || currentUser?.app_metadata?.role === "admin"),
    error: null,
  };
}

export async function joinCommunity(userId, communityID, userLocation) {
  if (!userId || !communityID) {
    return { error: new Error("Missing membership details."), status: "error" };
  }
  const { data: status, error } = await supabase.rpc("join_community", {
    target_community: communityID,
    user_latitude: userLocation?.latitude ?? null,
    user_longitude: userLocation?.longitude ?? null,
  });
  if (error) {
    console.error("Error updating community membership:", error.message);
  }
  return { error, status: error ? "error" : status };
}

export async function leaveCommunity(userId, communityID) {
  if (!userId || !communityID) {
    return { error: new Error("Missing membership details.") };
  }
  const { data: status, error } = await supabase.rpc("leave_community", {
    target_community: communityID,
  });
  if (error) {
    console.error("Error leaving community:", error.message);
  }

  return { error, status: error ? "error" : status };
}

export async function getOwnedCommunityRequestUUIDs(communityID) {
  if (!communityID) {
    return { data: [], error: new Error("Missing community ID.") };
  }

  const { data, error } = await supabase.rpc("get_owned_community_request_uuids", {
    target_community: communityID,
  });

  if (error) {
    console.error("Unable to load community join requests:", error.message);
    return { data: [], error };
  }

  return { data: Array.isArray(data) ? data : [], error: null };
}

export async function respondToCommunityJoinRequest(communityID, requesterID, approved) {
  if (!communityID || !requesterID) {
    return { status: "error", error: new Error("Missing join request details.") };
  }

  const { data: status, error } = await supabase.rpc("respond_to_community_join_request", {
    target_community: communityID,
    requester_id: requesterID,
    approve_request: approved === true,
  });

  if (error) {
    console.error("Unable to respond to community join request:", error.message);
  }

  return { status: error ? "error" : status, error };
}

export async function setCommunityPrivacy(communityID, makePrivate) {
  if (!communityID) {
    return { isPrivate: false, error: new Error("Missing community ID.") };
  }

  const { data, error } = await supabase.rpc("set_community_privacy", {
    target_community: communityID,
    make_private: makePrivate === true,
  });

  if (error) {
    console.error("Unable to update community privacy:", error.message);
  }

  return { isPrivate: data === true, error };
}

// Formatting

export function formatDateTime(value) {
  return new Date(value).toLocaleString(getLanguage() === "es" ? "es-ES" : "en-US");
}

export function getQueryParameter(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371e3;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitude1 = toRadians(lat1);
  const latitude2 = toRadians(lat2);
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function isWithinCommunityRadius(community, userLocation) {
  if (community?.global) {
    return true;
  }

  const coordinates = [
    community?.latitude,
    community?.longitude,
    community?.radius_meters,
    userLocation?.latitude,
    userLocation?.longitude,
  ];
  if (!coordinates.every(Number.isFinite)) {
    return false;
  }

  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    community.latitude,
    community.longitude,
  ) <= community.radius_meters;
}

export function filterBySearch(items, query, getSearchText = (item) => String(item)) {
  const normalizedQuery = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => getSearchText(item)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .includes(normalizedQuery));
}

// Components

function blockLoadingInput(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function createLoadingOverlay() {
  if (!document.getElementById("bloom-loading-styles")) {
    const styles = document.createElement("style");
    styles.id = "bloom-loading-styles";
    styles.textContent = `
      @keyframes bloom-loading-spin {
        to { transform: rotate(360deg); }
      }
      #bloom-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        background: rgba(0, 0, 0, 0.72);
        color: white;
        cursor: wait;
        touch-action: none;
      }
      #bloom-loading-spinner {
        width: 52px;
        height: 52px;
        box-sizing: border-box;
        border: 6px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: var(--border-radius-circle);
        animation: bloom-loading-spin 0.8s linear infinite;
      }
      #bloom-loading-message {
        margin: 0;
        font: 600 16px/1.4 system-ui, sans-serif;
      }
    `;
    document.head.appendChild(styles);
  }

  const overlay = document.createElement("div");
  overlay.id = "bloom-loading-overlay";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("aria-busy", "true");
  overlay.innerHTML = `
    <div id="bloom-loading-spinner" aria-hidden="true"></div>
    <p id="bloom-loading-message">Loading...</p>
  `;
  overlay.addEventListener("pointerdown", blockLoadingInput);
  overlay.addEventListener("click", blockLoadingInput);
  overlay.addEventListener("wheel", blockLoadingInput, { passive: false });
  document.body.appendChild(overlay);
  return overlay;
}

export function showLoadingOverlay(message = "Loading...") {
  loadingRequestCount += 1;

  if (!loadingOverlay) {
    loadingOverlay = createLoadingOverlay();
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.activeElement?.blur();
    document.addEventListener("keydown", blockLoadingInput, true);
    document.addEventListener("beforeinput", blockLoadingInput, true);
    document.addEventListener("submit", blockLoadingInput, true);
  }

  loadingOverlay.querySelector("#bloom-loading-message").textContent = message;

  let finished = false;
  return () => {
    if (finished) {
      return;
    }

    finished = true;
    hideLoadingOverlay();
  };
}

export function hideLoadingOverlay() {
  loadingRequestCount = Math.max(0, loadingRequestCount - 1);
  if (loadingRequestCount || !loadingOverlay) {
    return;
  }

  loadingOverlay.remove();
  loadingOverlay = null;
  document.body.style.overflow = previousBodyOverflow;
  document.removeEventListener("keydown", blockLoadingInput, true);
  document.removeEventListener("beforeinput", blockLoadingInput, true);
  document.removeEventListener("submit", blockLoadingInput, true);
}

export async function withLoadingOverlay(callback, message = "Loading...") {
  const finishLoading = showLoadingOverlay(message);
  try {
    return await callback();
  } finally {
    finishLoading();
  }
}

export function withTimeout(promise, timeout = 15000, message = "The request timed out.") {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), timeout);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

export function renderEmptyState(container, message) {
  if (!container) {
    return;
  }

  const card = document.createElement("div");
  card.className = "post";
  const text = document.createElement("p");
  text.style.cssText = "margin:0;color:#666";
  text.textContent = message;
  card.appendChild(text);
  container.replaceChildren(card);
}

export function formatEventLocation(location) {
  if (typeof location === "string") {
    return location.trim();
  }
  if (Array.isArray(location) && location.length >= 2) {
    return `${location[0]}, ${location[1]}`;
  }
  if (location && typeof location === "object") {
    if (location.name || location.address) {
      return String(location.name || location.address).trim();
    }
    const latitude = location.latitude ?? location.lat;
    const longitude = location.longitude ?? location.lng ?? location.lon;
    if (latitude !== undefined && longitude !== undefined) {
      return `${latitude}, ${longitude}`;
    }
  }
  return "";
}

export function isTrustedImageUrl(value, bucketName, allowBlob = false) {
  if (!value || !bucketName) {
    return false;
  }
  try {
    const url = new URL(value, window.location.href);
    if (allowBlob && url.protocol === "blob:") {
      return true;
    }
    const bucketPath = `/storage/v1/object/public/${encodeURIComponent(bucketName)}/`;
    return url.protocol === "https:"
      && url.origin === "https://auilmosognuitlpoqchn.supabase.co"
      && url.pathname.startsWith(bucketPath);
  } catch {
    return false;
  }
}

export function getPostImageUrls(imgLinks, imgLink) {
  const candidates = Array.isArray(imgLinks) ? [...imgLinks] : [];
  if (imgLink) {
    candidates.unshift(imgLink);
  }
  return [...new Set(candidates)].filter((url) => isTrustedImageUrl(url, "Post Images"));
}

export function applyAvatar(element, avatarUrl, altText = "") {
  if (!element) {
    return;
  }

  element.replaceChildren();
  if (!isTrustedImageUrl(avatarUrl, "Profile Pictures", true)) {
    return;
  }

  element.style.position = "relative";
  element.style.overflow = "hidden";
  const image = document.createElement("img");
  image.src = avatarUrl;
  image.alt = altText;
  image.loading = "lazy";
  image.decoding = "async";
  image.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit";
  element.appendChild(image);
}

function closePostMenu() {
  if (!openPostMenu) {
    return;
  }

  openPostMenu.menu.style.display = "none";
  openPostMenu.button.setAttribute("aria-expanded", "false");
  openPostMenu = null;
}

export async function reportPost(postId) {
  if (!window.confirm("Are you sure you want to report this post?")) {
    return;
  }

  await withLoadingOverlay(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      window.alert("You must be logged in to report a post.");
      return;
    }

    const { data: post, error: postError } = await supabase
      .from("Posts")
      .select("*")
      .eq("id", postId)
      .single();
    if (postError) {
      console.error("Error loading post for report:", postError.message);
      window.alert("Unable to report this post. Please try again.");
      return;
    }
    if (isPostOwner(post, user.id)) {
      window.alert("You cannot report your own post.");
      return;
    }

    const { error } = await supabase
      .from("PostReports")
      .insert([{ post_id: postId, reporter_id: user.id }]);

    if (error?.code === "23505") {
      window.alert("You have already reported this post.");
      return;
    }
    if (error) {
      console.error("Error reporting post:", error.message);
      window.alert("Unable to report this post. Please try again.");
      return;
    }

    window.alert("Post reported successfully.");
  }, "Reporting post...");
}

export function attachPostOptions(card, { postId, manageHref = null, onManage = null }) {
  if (!card || !postId) {
    return card;
  }

  card.style.position = "relative";

  const optionsButton = document.createElement("button");
  optionsButton.type = "button";
  optionsButton.className = "post-options-button";
  optionsButton.textContent = "⋮";
  optionsButton.setAttribute("aria-label", "Post options");
  optionsButton.setAttribute("aria-haspopup", "menu");
  optionsButton.setAttribute("aria-expanded", "false");
  optionsButton.style.cssText = "color: #000; position:absolute;top:8px;right:10px;z-index:2;border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer;padding:0 6px";

  const menu = document.createElement("div");
  menu.className = "post-options-menu";
  menu.setAttribute("role", "menu");
  menu.style.cssText = "color: #000; position:absolute;top:38px;right:10px;z-index:3;min-width:120px;padding:6px;background:white;border:1px solid #d7d7d7;border-radius:var(--border-radius);box-shadow:0 6px 18px rgba(0,0,0,.18)";
  menu.style.display = "none";

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.setAttribute("role", "menuitem");
  actionButton.style.cssText = "color: #000; display:block;width:100%;padding:8px 10px;border:0;border-radius:var(--border-radius);background:transparent;text-align:left;cursor:pointer";

  if (manageHref || onManage) {
    actionButton.textContent = "Manage";
    actionButton.addEventListener("click", () => {
      closePostMenu();
      if (onManage) {
        onManage();
      } else {
        window.location.href = manageHref;
      }
    });
  } else {
    actionButton.textContent = "Report";
    actionButton.addEventListener("click", async () => {
      closePostMenu();
      await reportPost(postId);
    });
  }

  optionsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.style.display !== "none";
    closePostMenu();
    if (!isOpen) {
      menu.style.display = "block";
      optionsButton.setAttribute("aria-expanded", "true");
      openPostMenu = { menu, button: optionsButton };
      actionButton.focus();
    }
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.appendChild(actionButton);
  card.append(optionsButton, menu);
  return card;
}

export function attachPostTypeBadge(card, postType = "post") {
  if (!card) {
    return card;
  }

  const types = {
    post: { icon: "📝", label: "Post" },
    activity: { icon: "⚡", label: "Activity" },
    event: { icon: "📅", label: "Event" },
  };
  const normalizedType = types[postType] ? postType : "post";
  const badge = document.createElement("div");
  badge.className = `post-type-badge post-type-badge--${normalizedType}`;
  badge.dataset.postType = normalizedType;

  const icon = document.createElement("span");
  icon.className = "post-type-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = types[normalizedType].icon;
  const label = document.createElement("span");
  label.dataset.i18nKey = `postType.${normalizedType}`;
  label.dataset.i18nIgnore = "true";
  label.textContent = types[normalizedType].label;
  badge.append(icon, label);
  card.insertBefore(badge, card.firstChild);
  return card;
}

export function createPostCard({
  postId,
  postType = "post",
  title,
  body,
  location,
  imgLink,
  imgLinks = [],
  footer,
  authorUserId,
  authorName,
  authorAvatarUrl,
  authorIsSupporter = false,
  communityName,
  manageHref,
}) {
  const card = document.createElement("div");
  card.classList.add("post");
  let footerElement = null;

  if (title) {
    const heading = document.createElement("h3");
    heading.dataset.i18nIgnore = "true";
    heading.style.cssText = "margin:0 0 8px 0;padding-right:40px";
    heading.textContent = title;
    card.appendChild(heading);
  }

  if (body) {
    const content = document.createElement("p");
    content.dataset.i18nIgnore = "true";
    content.style.cssText = "margin:0;color:#333;line-height:1.4";
    content.textContent = body;
    card.appendChild(content);
  }

  const eventLocation = formatEventLocation(location);
  if (String(postType).toLowerCase() === "event" && eventLocation) {
    const locationRow = document.createElement("p");
    locationRow.className = "post-location";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "📍";
    const label = document.createElement("strong");
    label.textContent = "Location:";
    const value = document.createElement("span");
    value.dataset.i18nIgnore = "true";
    value.textContent = eventLocation;
    locationRow.append(icon, label, value);
    card.appendChild(locationRow);
  }

  if (footer) {
    footerElement = document.createElement("p");
    footerElement.style.cssText = "margin:10px 0 0 0;font-size:12px;color:grey";
    footerElement.textContent = footer;
    card.appendChild(footerElement);
  }

  const imageUrls = getPostImageUrls(imgLinks, imgLink);
  if (imageUrls.length) {
    const gallery = document.createElement("div");
    gallery.className = `post-image-gallery post-image-gallery--${Math.min(imageUrls.length, 5)}`;
    imageUrls.forEach((imageUrl, index) => {
      const image = document.createElement("img");
      image.className = "post-image";
      image.src = imageUrl;
      image.alt = title ? `Image ${index + 1} for ${title}` : `Post image ${index + 1}`;
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => image.remove(), { once: true });
      gallery.appendChild(image);
    });
    card.insertBefore(gallery, footerElement);
  }

  if (authorName || communityName) {
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap;padding-right:40px";
    if (authorName) {
      const avatar = document.createElement("div");
      avatar.className = "pfp-frame";
      avatar.style.cssText = "width:30px;height:30px";
      applyAvatar(avatar, authorAvatarUrl, "Post author profile picture");
      const authorNameElement = document.createElement("strong");
      authorNameElement.className = "post-author-name";
      authorNameElement.style.color = "#618764";
      authorNameElement.dataset.i18nIgnore = "true";
      authorNameElement.textContent = authorName;
      header.append(avatar, authorNameElement);
      let authorLink;

      if (authorUserId) {
        authorLink = document.createElement("a");
        authorLink.className = "post-author-link";
        authorLink.href = `${PAGE_URLS.profile}?uid=${encodeURIComponent(authorUserId)}`;
        authorLink.setAttribute("aria-label", "Open author profile");
        authorNameElement.replaceWith(authorLink);
        authorLink.appendChild(authorNameElement);
      }

      if (authorIsSupporter) {
        (authorLink ?? header).appendChild(createSupporterBadge({ compact: true }));
      }
      if (authorUserId === 'd026f563-e776-4a67-9fd2-10eef3ec60f1') {
          (authorLink ?? header).appendChild(createSupporterBadge({ compact: false }, "Owner", "#FFD700"));
      }
    }

    if (communityName) {
      const context = document.createElement("span");
      context.style.cssText = "color:#888;font-size:0.85rem";
      const prefix = document.createElement("span");
      prefix.textContent = "in ";
      const name = document.createElement("span");
      name.dataset.i18nIgnore = "true";
      name.textContent = communityName;
      context.append(prefix, name);
      header.appendChild(context);
    }

    card.insertBefore(header, card.firstChild);
  }

  attachPostTypeBadge(card, postType);
  return attachPostOptions(card, { postId, manageHref });
}

export async function showCurrentUser(user, element, profileHref = PAGE_URLS.profile) {
  if (!user || !element) {
    return;
  }

  const profile = await getUserProfile(user.id);
  element.dataset.i18nIgnore = "true";
  element.replaceChildren(document.createTextNode(profile?.display_name || profile?.username || user.email || ""));
  if (isSupporter(profile)) {
    element.appendChild(createSupporterBadge({ compact: true }));
  }
  if (user.id === 'd026f563-e776-4a67-9fd2-10eef3ec60f1') {
      element.appendChild(createSupporterBadge({ compact: false }, "Owner", "#FFD700"));
  }
  const avatar = element.closest("#currentUserNav")?.querySelector(".pfp-frame");
  applyAvatar(avatar, profile?.avatar_url, "Profile picture");
  attachAccountMenu(avatar, profileHref);
  return profile;
}

function attachAccountMenu(avatar, profileHref = PAGE_URLS.profile) {
  if (!avatar || avatar.dataset.accountMenuReady === "true") {
    return;
  }

  avatar.dataset.accountMenuReady = "true";
  avatar.classList.add("account-menu-trigger");
  avatar.tabIndex = 0;
  avatar.setAttribute("role", "button");
  avatar.setAttribute("aria-label", "Open account menu");
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "account-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  const profileLink = document.createElement("a");
  profileLink.href = profileHref;
  profileLink.className = "account-menu-item";
  profileLink.setAttribute("role", "menuitem");
  profileLink.textContent = "Profile";

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "account-menu-item account-menu-logout";
  logoutButton.setAttribute("role", "menuitem");
  logoutButton.textContent = "Log Out";
  menu.append(profileLink, logoutButton);
  avatar.closest("nav")?.appendChild(menu);

  const closeMenu = () => {
    menu.hidden = true;
    avatar.setAttribute("aria-expanded", "false");
  };
  const toggleMenu = () => {
    const shouldOpen = menu.hidden;
    menu.hidden = !shouldOpen;
    avatar.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) {
      profileLink.focus();
    }
  };

  avatar.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });
  avatar.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleMenu();
    }
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
  logoutButton.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      alert("Failed to sign out. Please try again.");
      return;
    }
    window.location.href = PAGE_URLS.index;
  });
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      closeMenu();
      avatar.focus();
    }
  });
}

document.addEventListener("click", closePostMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openPostMenu) {
    const { button } = openPostMenu;
    closePostMenu();
    button.focus();
  }
});

// Animation

export async function PopupIn(element, options = {}) {
  const { duration = 0.5, easing = "ease-in-out" } = options;
  return element.animate(
    [
      { opacity: 0, transform: "scale(0.8)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: duration * 1000, easing, fill: "forwards" },
  ).finished;
}

export async function PopupOut(element, options = {}) {
  const { duration = 0.5, easing = "ease-in-out" } = options;
  return element.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.8)" },
    ],
    { duration: duration * 1000, easing, fill: "forwards" },
  ).finished;
}

// Dialogs

export function createPopupShell(title, content) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.innerHTML = `
    <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="popupTitle">
      <div class="popup-header">
        <h2 id="popupTitle"></h2>
        <button class="popup-close" type="button" aria-label="Close dialog">×</button>
      </div>
      <div class="popup-body"></div>
    </div>
  `;

  const card = overlay.querySelector(".popup-card");
  overlay.querySelector("#popupTitle").textContent = title;
  overlay.querySelector(".popup-body").appendChild(content);

  let isClosing = false;
  const handleEscape = (event) => {
    if (event.key === "Escape") {
      closePopup();
    }
  };
  const closePopup = async () => {
    if (isClosing) {
      return;
    }

    isClosing = true;
    overlay.classList.remove("is-visible");
    document.removeEventListener("keydown", handleEscape);
    await PopupOut(card, { duration: 0.2 });
    overlay.remove();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePopup();
    }
  });
  overlay.querySelector(".popup-close").addEventListener("click", closePopup);
  document.addEventListener("keydown", handleEscape);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add("is-visible");
    PopupIn(card, { duration: 0.2 });
  });

  return { overlay, closePopup };
}

// Location

export function getUserLocation() {
  if (!navigator.geolocation) {
    console.error("Geolocation is not supported by this browser.");
    return Promise.resolve(null);
  }

  return withTimeout(new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => resolve({ latitude, longitude }),
      (error) => {
        console.error("Error getting location:", error.message);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }), 12000, "Location request timed out.").catch((error) => {
    console.error("Unable to resolve location:", error.message);
    return null;
  });
}
