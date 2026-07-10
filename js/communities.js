import { supabase } from './supabase.js';
import {
    createPostCard,
    formatDateTime,
    getCommunityNameFromID,
    getCurrentUserOrRedirect,
    getUserProfile,
    renderEmptyState,
    PopupIn,
    PopupOut,
    getUserLocation
} from "./main.js";

const user = await getCurrentUserOrRedirect();

if (!user) {
    throw new Error('Unable to load communities without a logged-in user.');
}

const userLocation = await getUserLocation();



// DOM elements
const usernameLabel = document.getElementById('username-label');
const postsContainer = document.getElementById('communities-container');
const myCommunitiesContainer = document.getElementById('my-communities-container');

async function showCurrentUser() {
    if (!usernameLabel) {
        return;
    }

    const profile = await getUserProfile(user.id);
    usernameLabel.textContent = profile?.username || user.email || 'Logged in user';
}

showCurrentUser();

// Fetch communities from Supabase
async function fetchCommunities() {
    const { data: communities, error } = await supabase
        .from('Communities')
        .select('*');
    
    if (error) {
        console.error('Error fetching communities:', error.message);
        return;
    }

    displayCommunities(communities);
}

async function fetchMyCommunities() {
    const { data: communities, error } = await supabase
        .from('Communities')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching my communities:', error.message);
        return;
    }

    displayMyCommunities(communities);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

function displayCommunities(communities) {
    if (!postsContainer) return;
    if (!userLocation) {
        renderEmptyState(postsContainer, "Location access is required to view communities.");
        return;
    }
    postsContainer.innerHTML = '';
    
    communities.forEach(community => {
        const communityRadius = community.radius_meters;
        const communityLat = community.latitude;
        const communityLng = community.longitude;
        
        // Since it's a boolean, we can read it directly (falling back to false if undefined)
        const isGlobal = community.global ?? false; 

        if (!isGlobal) {
            const distance = calculateDistance(userLocation.latitude, userLocation.longitude, communityLat, communityLng);
            if (distance > communityRadius) {
                return; // Skip this community if the user is outside the radius
            }
        }

        const communityElement = document.createElement('div');
        communityElement.classList.add('community');
        
        // Dynamically display the label based on the boolean status
        const statusLabel = isGlobal ? '(Global)' : '(Local)';

        communityElement.innerHTML = `
            <h2>${community.name} ${statusLabel}</h2>
            <p>${community.description}</p>
            <p>Members: ${community.members?.length || 0}</p>
            <div class="com-buttons">
                <button style="padding: 10px; margin: 5px;" onclick="openCommunity('${community.id}')">View Community</button>
                <button style="padding: 10px; margin: 5px;" onclick="joinCommunity('${community.id}')">Join Community</button>
            </div>
        `;
        postsContainer.appendChild(communityElement);
    });
}

function displayMyCommunities(communities) {
    if (!myCommunitiesContainer) return;
    myCommunitiesContainer.innerHTML = '';

    communities.forEach(community => {
        const communityElement = document.createElement('div');
        communityElement.classList.add('community');

        // 1. FIX: Check the community's own global property just like in displayCommunities
        const isGlobal = community.global ?? false; 
        const locationBadge = isGlobal ? '(Global)' : '(Local)'; // Or leave local empty '' if preferred

        communityElement.innerHTML = `
            <h2>${community.name} ${locationBadge}</h2>
            <p>${community.description}</p>
            <p>Members: ${community.members?.length || 0}</p>
            <div class="com-buttons">
                <button style="padding: 10px; margin: 5px;" onclick="openCommunity('${community.id}')">View Community</button>
                <button style="padding: 10px; margin: 5px;" onclick="joinCommunity('${community.id}')">Join Community</button>
            </div>
        `;
        
        // 2. FIX: Append to myCommunitiesContainer, not postsContainer
        myCommunitiesContainer.appendChild(communityElement);
    });
}

function createPopupShell(title, content) {
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
    overlay.innerHTML = `
        <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="popupTitle">
            <div class="popup-header">
                <h2 id="popupTitle">${title}</h2>
                <button class="popup-close" type="button" aria-label="Close dialog">×</button>
            </div>
            <div class="popup-body"></div>
        </div>
    `;

    const card = overlay.querySelector(".popup-card");
    const body = overlay.querySelector(".popup-body");
    body.appendChild(content);

    const closeButton = overlay.querySelector(".popup-close");
    const closePopup = () => {
        overlay.classList.remove("is-visible");
        PopupOut(card, { duration: 0.2 });
        window.setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 200);
        document.removeEventListener("keydown", handleEscape);
    };

    function handleEscape(event) {
        if (event.key === "Escape") {
            closePopup();
        }
    }

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closePopup();
        }
    });

    closeButton.addEventListener("click", closePopup);
    document.addEventListener("keydown", handleEscape);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
        overlay.classList.add("is-visible");
        PopupIn(card, { duration: 0.2 });
    });

    return { overlay, closePopup };
}

function openCommunity(id) {
    window.location.href = `community.html?communityID=${id}`;
}





// FIXED: Changed class to id="create-community-form" to match your CSS selector
function createCommunityForm() {
    const form = document.createElement("form");
    form.id = "create-community-form"; 
    form.innerHTML = `
        <label for="communityName">Community Name:</label>
        <input type="text" id="communityName" placeholder="Enter community name" />
        <label for="communityDescription">Community Description:</label>
        <textarea id="communityDescription" placeholder="Enter community description"></textarea>
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

fetchMyCommunities();
fetchCommunities();

const createBtn = document.getElementById("createCommunityButton");
if (createBtn) {
    createBtn.addEventListener("click", () => {
        if (!userLocation) {
            alert("Location access is required to create a community.");
            return;
        }
        const formElement = createCommunityForm();
        const { closePopup } = createPopupShell("Create Community", formElement);

        formElement.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("communityName").value.trim();
            const description = document.getElementById("communityDescription").value.trim();
            const radiusMeters = parseInt(document.getElementById("communityLocation").value, 10);

            if (!name || !description) {
                alert("Please fill in both the community name and description.");
                return;
            }

            // Create the community
            const { data: newCommunityData, error: insertError } = await supabase
                .from("Communities")
                .insert([
                    { 
                        name, 
                        description, 
                        user_id: user.id, 
                        latitude: userLocation.latitude, 
                        longitude: userLocation.longitude, 
                        radius_meters: radiusMeters, 
                        members: [user.id] 
                    }
                ])
                .select(); 

            if (insertError) {
                console.error("Error creating community:", insertError.message);
                alert("Failed to create community. Please try again.");
                return;
            }

            const newCommunityId = newCommunityData[0].id;

            // Fetch the current user's profile to get their existing joined_communities array
            const { data: profile, error: fetchProfileError } = await supabase
                .from("profiles")
                .select("joined_communities")
                .eq("id", user.id)
                .single();

            if (fetchProfileError) {
                console.error("Error fetching user profile:", fetchProfileError.message);
                alert("Community created, but couldn't access your profile to link it.");
                return;
            }

            // Fallback to empty array if joined_communities is null/undefined
            const currentCommunities = profile.joined_communities || [];
            
            // Append the new ID (ensuring no duplicates just in case)
            const updatedCommunities = currentCommunities.includes(newCommunityId)
                ? currentCommunities
                : [...currentCommunities, newCommunityId];

            // Update the profile back to Supabase
            const { error: profileUpdateError } = await supabase
                .from("profiles")
                .update({ joined_communities: updatedCommunities })
                .eq("id", user.id);

            if (profileUpdateError) {
                console.error("Error updating user profile with new community:", profileUpdateError.message);
                alert("Community created, but failed to update your profile list. Please refresh.");
                return;
            }

            alert("Community created successfully!");
            closePopup(); 
            fetchMyCommunities();
            fetchCommunities();
        });
    });
}
window.openCommunity = openCommunity;