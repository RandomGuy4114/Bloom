// Dependencies

import { supabase } from "./supabase.js";
import { getLanguage, setLanguage } from "./i18n.js";

// Definitions

const communityNameCache = new Map();
const userProfileCache = new Map();
let loadingOverlay;
let loadingRequestCount = 0;
let previousBodyOverflow = "";
let openPostMenu;

export const PAGE_URLS = Object.freeze({
  index: new URL("../", import.meta.url).href,
  login: new URL("../pages/auth/login/", import.meta.url).href,
  home: new URL("../pages/app/home/", import.meta.url).href,
  profile: new URL("../pages/app/profile/", import.meta.url).href,
  activity: new URL("../pages/app/activity/", import.meta.url).href,
  map: new URL("../pages/app/map/", import.meta.url).href,
  settings: new URL("../pages/app/settings/", import.meta.url).href,
  post: new URL("../pages/app/post/", import.meta.url).href,
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
    .select("Language")
    .eq("id", user.id)
    .single();
  if (profile?.Language) {
    setLanguage(profile.Language);
  }

  return user;
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
  const { error } = await supabase.rpc("leave_community", { target_community: communityID });
  if (error) {
    console.error("Error leaving community:", error.message);
  }

  return { error };
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
        border-radius: 50%;
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
  menu.style.cssText = "color: #000; position:absolute;top:38px;right:10px;z-index:3;min-width:120px;padding:6px;background:white;border:1px solid #d7d7d7;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18)";
  menu.style.display = "none";

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.setAttribute("role", "menuitem");
  actionButton.style.cssText = "color: #000; display:block;width:100%;padding:8px 10px;border:0;border-radius:6px;background:transparent;text-align:left;cursor:pointer";

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
    post: { iconClass: "ri-mail-fill", label: "Post" },
    activity: { iconClass: "ri-user-3-line", label: "Activity" },
    event: { iconClass: "ri-calendar-event-line", label: "Event" },
  };
  const normalizedType = types[postType] ? postType : "post";
  const badge = document.createElement("div");
  badge.className = `post-type-badge post-type-badge--${normalizedType}`;
  badge.dataset.postType = normalizedType;

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  const iconGlyph = document.createElement("i");
  iconGlyph.className = types[normalizedType].iconClass;
  icon.appendChild(iconGlyph);
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
  footer,
  authorUserId,
  authorName,
  authorAvatarUrl,
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

  if (isTrustedImageUrl(imgLink, "Post Images")) {
    const image = document.createElement("img");
    image.className = "post-image";
    image.src = imgLink;
    image.alt = title ? `Image for ${title}` : "Post image";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => image.remove(), { once: true });
    card.insertBefore(image, footerElement);
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

      if (authorUserId) {
        const authorLink = document.createElement("a");
        authorLink.className = "post-author-link";
        authorLink.href = `${PAGE_URLS.profile}?uid=${encodeURIComponent(authorUserId)}`;
        authorLink.setAttribute("aria-label", "Open author profile");
        authorNameElement.replaceWith(authorLink);
        authorLink.appendChild(authorNameElement);
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

export async function showCurrentUser(user, element) {
  if (!user || !element) {
    return;
  }

  const profile = await getUserProfile(user.id);
  element.dataset.i18nIgnore = "true";
  element.textContent = profile?.display_name || profile?.username || user.email || "";
  const avatar = element.closest(".topbar")?.querySelector(".pfp-frame");
  applyAvatar(avatar, profile?.avatar_url, "Profile picture");
  attachAccountMenu(avatar);
}

function attachAccountMenu(avatar) {
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
  profileLink.href = PAGE_URLS.profile;
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

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => resolve({ latitude, longitude }),
      (error) => {
        console.error("Error getting location:", error.message);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  });
}
