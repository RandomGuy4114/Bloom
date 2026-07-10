// Dependencies

import { supabase } from "./supabase.js";
import {
  createPostCard,
  filterBySearch,
  formatDateTime,
  getCurrentUserOrRedirect,
  getUserLocation,
  getUserProfile,
  isPostOwner,
  isWithinCommunityRadius,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const activitySearchInput = document.getElementById("activitySearchInput");
const activityFeedContainer = document.getElementById("activityFeedContainer");
const eventSearchInput = document.getElementById("eventSearchInput");
const eventSearchButton = document.getElementById("eventSearchButton");
const eventFeedContainer = document.getElementById("eventFeedContainer");
const activityFilterButtons = [...document.querySelectorAll("[data-activity-filter]")];
const eventFilterButtons = [...document.querySelectorAll("[data-event-filter]")];

let user;
let userLocation;
let typedPosts = [];
let activityFilter = "all";
let eventFilter = "all";

// Components

function matchesSelectedFilter(post, selectedFilter) {
  if (selectedFilter === "my") {
    return isPostOwner(post, user.id);
  }
  if (selectedFilter === "nearby") {
    return isWithinCommunityRadius(post.communityDetails, userLocation);
  }
  return true;
}

function getEmptyMessage(type, selectedFilter, hasSearch) {
  if (hasSearch) {
    return type === "activity"
      ? "No activities match your search."
      : "No events match your search.";
  }
  if (selectedFilter === "my") {
    return type === "activity"
      ? "You have not created any activities."
      : "You have not created any events.";
  }
  if (selectedFilter === "nearby") {
    if (!userLocation) {
      return "Location access is required to show nearby posts.";
    }
    return type === "activity"
      ? "No nearby activities are available."
      : "No nearby events are available.";
  }
  return type === "activity"
    ? "No activities are available."
    : "No events are available.";
}

function renderTypedPosts(type) {
  const isActivity = type === "activity";
  const container = isActivity ? activityFeedContainer : eventFeedContainer;
  const input = isActivity ? activitySearchInput : eventSearchInput;
  const selectedFilter = isActivity ? activityFilter : eventFilter;
  const postsForType = typedPosts.filter((post) => (
    post.post_type === type && matchesSelectedFilter(post, selectedFilter)
  ));
  const visiblePosts = filterBySearch(
    postsForType,
    input.value,
    (post) => `${post.title ?? ""} ${post.body ?? ""} ${post.authorName} ${post.communityName}`,
  );

  if (!visiblePosts.length) {
    renderEmptyState(container, getEmptyMessage(type, selectedFilter, Boolean(input.value.trim())));
    return;
  }

  const cards = visiblePosts.map((post) => createPostCard({
    postId: post.id,
    postType: post.post_type,
    title: post.title,
    body: post.body,
    footer: `Posted on: ${formatDateTime(post.created_at)}`,
    authorName: post.authorName,
    communityName: post.communityName,
    manageHref: isPostOwner(post, user.id) ? `post.html?postId=${post.id}` : null,
  }));
  container.replaceChildren(...cards);
}

function selectFilter(buttons, selectedButton) {
  buttons.forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

// Data

async function loadTypedPosts() {
  const { data: posts, error: postsError } = await supabase
    .from("Posts")
    .select("*")
    .in("post_type", ["activity", "event"])
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching activities and events:", postsError.message);
    renderEmptyState(activityFeedContainer, "Unable to load activities right now.");
    renderEmptyState(eventFeedContainer, "Unable to load events right now.");
    return;
  }

  const communityIds = [...new Set((posts ?? []).map((post) => post.community).filter(Boolean))];
  const authorIds = [...new Set((posts ?? []).map((post) => post.user_id ?? post.author).filter(Boolean))];
  const [{ data: communities, error: communitiesError }, profiles] = await Promise.all([
    communityIds.length
      ? supabase
        .from("Communities")
        .select("id, name, global, latitude, longitude, radius_meters")
        .in("id", communityIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(authorIds.map(async (authorId) => [authorId, await getUserProfile(authorId)])),
  ]);

  if (communitiesError) {
    console.error("Error fetching activity communities:", communitiesError.message);
  }

  const communitiesById = new Map((communities ?? []).map((community) => [community.id, community]));
  const profilesById = new Map(profiles);
  typedPosts = (posts ?? []).map((post) => {
    const authorId = post.user_id ?? post.author;
    const community = communitiesById.get(post.community);
    return {
      ...post,
      authorName: isPostOwner(post, user.id)
        ? "You"
        : profilesById.get(authorId)?.username || "Unknown",
      communityName: community?.name || "Unknown Community",
      communityDetails: community,
    };
  });

  renderTypedPosts("activity");
  renderTypedPosts("event");
}

// Events

activitySearchInput.addEventListener("input", () => renderTypedPosts("activity"));
eventSearchInput.addEventListener("input", () => renderTypedPosts("event"));
eventSearchButton.addEventListener("click", () => renderTypedPosts("event"));

activityFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activityFilter = button.dataset.activityFilter;
    selectFilter(activityFilterButtons, button);
    renderTypedPosts("activity");
  });
});

eventFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    eventFilter = button.dataset.eventFilter;
    selectFilter(eventFilterButtons, button);
    renderTypedPosts("event");
  });
});

// Initialization

await withLoadingOverlay(async () => {
  user = await getCurrentUserOrRedirect();
  if (!user) {
    return;
  }

  [userLocation] = await Promise.all([
    getUserLocation(),
    showCurrentUser(user, usernameLabel),
  ]);
  await loadTypedPosts();
}, "Loading activities and events...");
