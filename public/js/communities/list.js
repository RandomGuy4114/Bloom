// Dependencies

import { supabase } from "../supabase.js?v=mtk6ih8q";
import { t } from "../i18n.js?v=mtk6ih8q";
import {
  createPopupShell,
  filterBySearch,
  getCurrentUserOrRedirect,
  getUserProfile,
  getUserLocation,
  isWithinCommunityRadius,
  isTrustedImageUrl,
  joinCommunity,
  leaveCommunity,
  PAGE_URLS,
  renderEmptyState,
  showCurrentUser,
  withLoadingOverlay,
} from "../main.js?v=mtk6ih8q";

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
let userIsSupporter = false;
const allowedCommunityImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumCommunityImageSize = 5 * 1024 * 1024;

// Components

function createCommunityCard(community, includeMembershipButton = true) {
  const communityElement = document.createElement("div");
  const communityProfile = document.createElement("div");
  communityElement.className = "community";
  communityProfile.className = "community-profile";
  communityElement.appendChild(communityProfile);

  const picture = document.createElement("div");
  picture.className = "community-picture";
  if (isTrustedImageUrl(community.picture_url, "Community Images")) {
    const image = document.createElement("img");
    image.src = community.picture_url;
    image.alt = `${community.name} community image`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      picture.replaceChildren();
      picture.classList.add("community-picture--fallback");
      picture.textContent = community.name?.trim().charAt(0).toLocaleUpperCase() || "?";
    }, { once: true });
    picture.appendChild(image);
  } else {
    picture.classList.add("community-picture--fallback");
    picture.textContent = community.name?.trim().charAt(0).toLocaleUpperCase() || "?";
    picture.setAttribute("aria-label", `${community.name || "Community"} community image`);
  }
  communityProfile.appendChild(picture);
  const infoSection = document.createElement("div");
  infoSection.className = "community-info";
  communityProfile.appendChild(infoSection);



  const heading = document.createElement("h2");
  heading.style.paddingLeft = "20px";
  const communityName = document.createElement("span");
  communityName.dataset.i18nIgnore = "true";
  communityName.textContent = community.name;
  const communityScope = document.createElement("span");
  communityScope.textContent = community.business
    ? " Business"
    : community.global
      ? " (Global)"
      : community.private
        ? " (Private)"
        : " (Local)";
  if (community.business) communityScope.className = "business-community-tag";
  heading.append(communityName, communityScope);

  const description = document.createElement("p");
  description.dataset.i18nIgnore = "true";
  description.textContent = community.description;
  description.style.paddingLeft = "20px";

  const memberCount = document.createElement("p");
  memberCount.innerHTML = `<i class="ri-user-line"></i> ${community.members?.length || 0}`;

  const actions = document.createElement("div");
  actions.className = "com-buttons";

  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.style.cssText = "padding: 10px; margin: 5px;";
  viewButton.innerHTML = '<i class="ri-search-line"></i> View Community';
  viewButton.addEventListener("click", () => {
    window.location.href = `${PAGE_URLS.community}?communityID=${community.id}`;
  });
  actions.appendChild(viewButton);

  const isPrivate = community.private === true;

  if (includeMembershipButton) {
    const joinButton = document.createElement("button");
    joinButton.type = "button";
    joinButton.style.cssText = "padding: 10px; margin: 5px;";
    const isMember = joinedCommunityIds.has(community.id) || (community.members?.includes(user.id) ?? false);
    const isOwner = community.user_id === user.id;
    if (isOwner) {
      joinButton.innerHTML = '<i class="ri-shield-user-line"></i> Community Owner';
      joinButton.disabled = true;
    } else if (isPrivate) {
      joinButton.innerHTML = isMember ? '<i class="ri-close-line"></i> Leave Community' : '<i class="ri-lock-line"></i> Request to Join';
    } else {
      joinButton.innerHTML = isMember ? '<i class="ri-close-line"></i> Leave Community' : '<i class="ri-user-add-line"></i> Join Community';
    }
    joinButton.classList.toggle("danger-action", isMember && !isOwner);
    joinButton.addEventListener("click", async () => {
      if (isOwner) {
        return;
      }

      if (joinedCommunityIds.has(community.id) || community.members?.includes(user.id)) {
        if (!window.confirm("Are you sure you want to leave this community?")) {
          return;
        }

        await withLoadingOverlay(async () => {
          const { error, status } = await leaveCommunity(user.id, community.id);
          if (error) {
            alert("Unable to leave the community at this time.");
            return;
          }
          if (status === "owner_cannot_leave") {
            alert("Community owners cannot leave their communities.");
            return;
          }
          if (status !== "left" && status !== "not_joined") {
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
          console.error("Error joining community:", error.message);
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
        if (status === "private_requested") {
          alert("This community is private. Your request to join has been sent to the community owner for approval.");
          return;
        }
        
        if (status === "already_requested") {
          alert("You have already requested to join this private community. Please wait for the community owner to approve your request.");
          return;
        }
        
        if (status !== "joined") {
          alert("Already joined or unable to join the community at this time.");
          return;
        }

        alert("Successfully joined the community!");
        await loadCommunities();
      }, "Joining community...");
    });
    actions.appendChild(joinButton);
  }

  infoSection.append(heading, description, memberCount);
  communityElement.appendChild(actions);
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
  const maximumRadius = userIsSupporter ? 40000 : 25000;
  const form = document.createElement("form");
  form.id = "create-community-form";
  form.innerHTML = `
    <label for="communityName">Community Name:</label>
    <input type="text" id="communityName" placeholder="Community name" maxlength="100" />
    <label for="communityDescription">Community Description:</label>
    <textarea id="communityDescription" placeholder="Describe your community" maxlength="1000"></textarea>
    <label for="communityImage">Community Image:</label>
    <input type="file" id="communityImage" accept="image/jpeg,image/png,image/webp" aria-describedby="communityImageHelp">
    <p id="communityImageHelp" class="community-image-help">Optional square image. JPEG, PNG, or WebP. Maximum 5 MB.</p>
    <div id="communityImagePreview" class="community-image-preview" hidden></div>
    <label class="settings-toggle" for="communityPrivate">
      <input id="communityPrivate" type="checkbox">
      <span>Private community</span>
    </label>
    <p class="community-image-help">Private communities require owner approval before people can join, and their posts are only visible to members.</p>
    <label for="communityLocation">Community Radius:</label>
    <div class="community-radius-control">
      <input type="range" id="communityLocation" min="100" max="${maximumRadius}" step="100" value="500" aria-describedby="communityRadiusValue">
      <output id="communityRadiusValue" for="communityLocation" data-i18n-ignore>500 meters</output>
    </div>
    <p>${userIsSupporter ? "Supporters can create communities with up to a 40 kilometer radius." : "Standard accounts can create communities with up to a 25 kilometer radius."}</p>
    <p>Note: The community made will only be accessible to people near your selected radius</p>
    <button type="submit" id="submitCommunityButton">Create Community</button>
  `;
  const radiusInput = form.querySelector("#communityLocation");
  const radiusOutput = form.querySelector("#communityRadiusValue");
  const updateRadiusOutput = () => {
    const meters = Number(radiusInput.value);
    radiusOutput.value = t(meters >= 1000
      ? `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kilometers`
      : `${meters} meters`);
  };
  radiusInput.addEventListener("input", updateRadiusOutput);
  const imageInput = form.querySelector("#communityImage");
  const imagePreview = form.querySelector("#communityImagePreview");
  imageInput.addEventListener("change", () => {
    imagePreview.replaceChildren();
    const file = imageInput.files?.[0];
    imagePreview.hidden = !file;
    if (!file) return;
    const image = document.createElement("img");
    const previewUrl = URL.createObjectURL(file);
    image.src = previewUrl;
    image.alt = "Community image preview";
    image.addEventListener("load", () => URL.revokeObjectURL(previewUrl), { once: true });
    imagePreview.appendChild(image);
  });
  updateRadiusOutput();
  return form;
}

// Data

async function loadCommunities() {
  const [{ data: communities, error }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from("Communities")
      .select("id, created_at, name, description, user_id, banner_url, picture_url, members, global, latitude, longitude, radius_meters, location_label, business, private"),
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

async function uploadCommunityImage(communityId, imageFile) {
  if (!imageFile) return { pictureUrl: null, path: null, error: null };
  const extension = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${communityId}/picture.${extension}`;
  const { error } = await supabase.storage.from("Community Images").upload(path, imageFile, {
    cacheControl: "3600",
    contentType: imageFile.type,
    upsert: false,
  });
  if (error) return { pictureUrl: null, path, error };
  const { data } = supabase.storage.from("Community Images").getPublicUrl(path);
  return { pictureUrl: data.publicUrl, path, error: null };
}

async function createCommunity({ name, description, radiusMeters, imageFile, isPrivate }) {
  const communityId = crypto.randomUUID();
  const upload = await uploadCommunityImage(communityId, imageFile);
  if (upload.error) return { error: upload.error };
  const { error } = await supabase
    .from("Communities")
    .insert([{
      id: communityId,
      name,
      description,
      picture_url: upload.pictureUrl,
      user_id: user.id,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radius_meters: radiusMeters,
      members: [user.id],
      private: isPrivate === true,
    }])
    .select("id")
    .single();

  if (error && upload.path) {
    await supabase.storage.from("Community Images").remove([upload.path]);
  }

  return { error };
}

// Events

communitiesSearchInput?.addEventListener("input", renderCommunities);
myCommunitiesSearchInput?.addEventListener("input", renderMyCommunities);

if (createCommunityButton && !createCommunityButton.dataset.clickBound) {
  createCommunityButton.dataset.clickBound = "true";
  createCommunityButton.addEventListener("click", () => {
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
      const imageFile = form.querySelector("#communityImage").files?.[0] ?? null;
      const isPrivate = form.querySelector("#communityPrivate").checked;

      if (!name || !description) {
        alert("Please fill in both the community name and description.");
        return;
      }
      if (imageFile && (!allowedCommunityImageTypes.has(imageFile.type) || imageFile.size > maximumCommunityImageSize)) {
        alert("Choose a JPEG, PNG, or WebP community image that is 5 MB or smaller.");
        return;
      }

      await withLoadingOverlay(async () => {
        const { error } = await createCommunity({
          name,
          description,
          radiusMeters,
          imageFile,
          isPrivate,
        });
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
}

// Initialization

await (async () => {
  user = await getCurrentUserOrRedirect();
  if (!user) {
    return;
  }

  const [location, profile] = await Promise.all([
    getUserLocation(),
    getUserProfile(user.id),
    showCurrentUser(user, usernameLabel),
  ]);
  userLocation = location;
  userIsSupporter = profile?.supporter === true;
  await loadCommunities();
})();
