// Dependencies

import { supabase } from "../supabase.js";
import {
  createPopupShell,
  filterBySearch,
  getCurrentUserOrRedirect,
  getUserLocation,
  isWithinCommunityRadius,
  joinCommunity,
  leaveCommunity,
  PAGE_URLS,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "../main.js";

// Definitions

const usernameLabel = document.getElementById("username-label");
const communitiesContainer = document.getElementById("communities-container");
const myCommunitiesContainer = document.getElementById("my-communities-container");
const createCommunityButton = document.getElementById("createCommunityButton");
const communitiesSearchInput = document.getElementById("communitiesSearchInput");
const myCommunitiesSearchInput = document.getElementById("myCommunitiesSearchInput");

let user;
let userLocation;
let allCommunities = [];
let joinedCommunities = [];
let joinedCommunityIds = new Set();

// Components

function createCommunityCard(community, includeMembershipButton = true) {
  const communityElement = document.createElement("div");
  communityElement.className = "community";

  const heading = document.createElement("h2");
  const communityName = document.createElement("span");
  communityName.dataset.i18nIgnore = "true";
  communityName.textContent = community.name;
  const communityScope = document.createElement("span");
  communityScope.textContent = community.global ? " (Global)" : " (Local)";
  heading.append(communityName, communityScope);

  const description = document.createElement("p");
  description.dataset.i18nIgnore = "true";
  description.textContent = community.description;

  const memberCount = document.createElement("p");
  memberCount.textContent = `Members: ${community.members?.length || 0}`;

  const actions = document.createElement("div");
  actions.className = "com-buttons";

  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.style.cssText = "padding: 10px; margin: 5px;";
  viewButton.textContent = "View Community";
  viewButton.addEventListener("click", () => {
    window.location.href = `${PAGE_URLS.community}?communityID=${community.id}`;
  });
  actions.appendChild(viewButton);

  if (includeMembershipButton) {
    const joinButton = document.createElement("button");
    joinButton.type = "button";
    joinButton.style.cssText = "padding: 10px; margin: 5px;";
    const isMember = joinedCommunityIds.has(community.id) || (community.members?.includes(user.id) ?? false);
    joinButton.textContent = isMember ? "Leave Community" : "Join Community";
    joinButton.classList.toggle("danger-action", isMember);
    joinButton.addEventListener("click", async () => {
      if (joinedCommunityIds.has(community.id) || community.members?.includes(user.id)) {
        if (!window.confirm("Are you sure you want to leave this community?")) {
          return;
        }

        await withLoadingOverlay(async () => {
          const { error } = await leaveCommunity(user.id, community.id);
          if (error) {
            alert("Unable to leave the community at this time.");
            return;
          }
          alert("You left the community.");
          await loadCommunities();
        }, "Leaving community...");
        return;
      }

      await withLoadingOverlay(async () => {
        const { error, status } = await joinCommunity(user.id, community.id, userLocation);
        if (error) {
          alert("Unable to join the community at this time.");
          return;
        }
        if (status === "out_of_range") {
          joinButton.textContent = "Outside Community Area";
          joinButton.disabled = true;
          alert("You must be within this community's radius to join it.");
          return;
        }
        if (status === "already_joined") {
          await loadCommunities();
          return;
        }
        if (status !== "joined") {
          alert("Unable to join the community at this time.");
          return;
        }

        alert("Successfully joined the community!");
        await loadCommunities();
      }, "Joining community...");
    });
    actions.appendChild(joinButton);
  }

  communityElement.append(heading, description, memberCount, actions);
  return communityElement;
}

function renderCommunities() {
  if (!communitiesContainer) {
    return;
  }

  const nearbyCommunities = allCommunities.filter((community) => (
    isWithinCommunityRadius(community, userLocation)
  ));
  const visibleCommunities = filterBySearch(
    nearbyCommunities,
    communitiesSearchInput?.value ?? "",
    (community) => `${community.name ?? ""} ${community.description ?? ""}`,
  );

  communitiesContainer.replaceChildren(...visibleCommunities.map((community) => createCommunityCard(community)));

  if (!visibleCommunities.length) {
    let message = "No communities are available in your area.";
    if (communitiesSearchInput?.value.trim()) {
      message = "No communities match your search.";
    } else if (!userLocation && allCommunities.some((community) => !community.global)) {
      message = "Location access is required to view local communities.";
    }
    renderEmptyState(communitiesContainer, message);
  }
}

function renderMyCommunities() {
  if (!myCommunitiesContainer) {
    return;
  }

  const visibleCommunities = filterBySearch(
    joinedCommunities,
    myCommunitiesSearchInput?.value ?? "",
    (community) => `${community.name ?? ""} ${community.description ?? ""}`,
  );
  myCommunitiesContainer.replaceChildren(
    ...visibleCommunities.map((community) => createCommunityCard(community)),
  );

  if (!visibleCommunities.length) {
    const message = myCommunitiesSearchInput?.value.trim()
      ? "None of your communities match your search."
      : "You have not joined any communities yet.";
    renderEmptyState(myCommunitiesContainer, message);
  }
}

function createCommunityForm() {
  const form = document.createElement("form");
  form.id = "create-community-form";
  form.innerHTML = `
    <label for="communityName">Community Name:</label>
    <input type="text" id="communityName" placeholder="Community name" maxlength="100" />
    <label for="communityDescription">Community Description:</label>
    <textarea id="communityDescription" placeholder="Describe your community" maxlength="1000"></textarea>
    <button type="submit" id="submitCommunityButton">Create Community</button>
    <label for="communityLocation">Community Radius:</label>
    <select id="communityLocation">
      <option value="100">100 meters</option>
      <option value="500">500 meters</option>
      <option value="2000">2 kilometers</option>
      <option value="20000">20 kilometers</option>
    </select>
    <p>Note: The community made will only be accessible to people near your selected radius</p>
  `;
  return form;
}

// Data

async function loadCommunities() {
  const [{ data: communities, error }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("Communities").select("*"),
    supabase.from("profiles").select("joined_communities").eq("id", user.id).single(),
  ]);

  if (error || profileError) {
    console.error("Error fetching communities:", error?.message ?? profileError?.message);
  }

  if (!error) {
    allCommunities = communities ?? [];
  }

  if (!profileError) {
    joinedCommunityIds = new Set(profile?.joined_communities ?? []);
  }

  if (!error) {
    renderCommunities();
  }

  if (!error && !profileError) {
    joinedCommunities = allCommunities.filter((community) => joinedCommunityIds.has(community.id));
    renderMyCommunities();
  }
}

async function createCommunity({ name, description, radiusMeters }) {
  const { error } = await supabase
    .from("Communities")
    .insert([{
      name,
      description,
      user_id: user.id,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radius_meters: radiusMeters,
      members: [user.id],
    }])
    .select("id")
    .single();

  return { error };
}

// Events

communitiesSearchInput?.addEventListener("input", renderCommunities);
myCommunitiesSearchInput?.addEventListener("input", renderMyCommunities);

createCommunityButton?.addEventListener("click", () => {
  if (!userLocation) {
    alert("Location access is required to create a community.");
    return;
  }

  const form = createCommunityForm();
  const { closePopup } = createPopupShell("Create Community", form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = form.querySelector("#communityName").value.trim();
    const description = form.querySelector("#communityDescription").value.trim();
    const radiusMeters = Number.parseInt(form.querySelector("#communityLocation").value, 10);

    if (!name || !description) {
      alert("Please fill in both the community name and description.");
      return;
    }

    await withLoadingOverlay(async () => {
      const { error } = await createCommunity({ name, description, radiusMeters });
      if (error) {
        console.error("Error creating community:", error.message);
        alert("Failed to create community. Please try again.");
        return;
      }

      await closePopup();
      alert("Community created successfully!");
      await loadCommunities();
    }, "Creating community...");
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
  await loadCommunities();
}, "Loading communities...");
