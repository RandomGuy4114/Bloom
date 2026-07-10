import { supabase } from './supabase.js';
import {
    createPostCard,
    formatDateTime,
    getCommunityNameFromID,
    getCurrentUserOrRedirect,
    getUserProfile,
    renderEmptyState,
    PopupIn,
    PopupOut
} from "./main.js";

const user = await getCurrentUserOrRedirect();

if (!user) {
    throw new Error('Unable to load communities without a logged-in user.');
}



const usernameLabel = document.getElementById('username-label');
const postsContainer = document.getElementById('com-posts');
const communityNameElement = document.getElementById('comName');
const communityDescElement = document.getElementById('comDesc');
const joinCommunityButton = document.getElementById('joinCommunityButton');

async function showCurrentUser() {
    if (!usernameLabel) {
        return;
    }

    const profile = await getUserProfile(user.id);
    usernameLabel.textContent = profile?.username || user.email || 'Logged in user';
}

const params = new URLSearchParams(window.location.search);
const communityID = params.get("communityID");

if (!communityID) {
    console.error("No communityID provided in the URL.");
    renderEmptyState(postsContainer, "No community selected.");
} else {
    // Fetch and display the community name and description
    const { data: community, error: communityError } = await supabase
        .from('Communities')
        .select('name, description')
        .eq('id', communityID)
        .single();

    if (communityError) {
        console.error("Error fetching community details:", communityError.message);
        renderEmptyState(postsContainer, "Unable to load community details.");
    } else {
        communityNameElement.textContent = community.name || "Community Name";
        communityDescElement.textContent = community.description || "No description available.";
    }

    // Fetch posts for the specific community
    const { data: posts, error: postsError } = await supabase
        .from('Posts')
        .select('*')
        .eq('community', communityID)
        .order('created_at', { ascending: false });

    if (postsError) {
        console.error("Error fetching posts for the community:", postsError.message);
        renderEmptyState(postsContainer, "Unable to load posts for this community.");
    } else {
        postsContainer.innerHTML = "";

        if (!posts || posts.length === 0) {
            renderEmptyState(postsContainer, "No posts yet in this community.");
        } else {
            for (const post of posts) {
                const card = createPostCard({
                    title: post.title,
                    body: post.body,
                    footer: `Posted on ${formatDateTime(post.created_at)}`,
                    authorName: post.user_id ? (await getUserProfile(post.user_id))?.username : "Unknown",
                    communityName: community.name,
                    createdAt: post.created_at,
                });
                const header = document.createElement("div");
                header.style.display = "flex";
                header.style.alignItems = "center";
                header.style.marginBottom = "10px";
                header.style.gap = "10px";
                header.style.flexWrap = "wrap";
                header.innerHTML = `
                    <div class="pfp-frame" style="width: 30px; height: 30px;"></div>
                    <strong style="color: #618764;">${post.user_id ? (await getUserProfile(post.user_id))?.username : "Unknown"}</strong>
                    <span style="color: #888; font-size: 0.85rem;">in ${community.name}</span>
                `;
                card.insertBefore(header, card.firstChild);
                if (post.user_id === user.id) {
                    const manageButton = document.createElement("button");
                    manageButton.textContent = "Manage Post";
                    manageButton.style.marginLeft = "auto";
                    manageButton.addEventListener("click", () => {
                        window.location.href = `post.html?postId=${post.id}`;
                    });
                    header.appendChild(manageButton);
                }
                postsContainer.appendChild(card);
            }
        }
    }
}

joinCommunityButton.addEventListener('click', async () => {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('joined_communities')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error("Error fetching user profile:", profileError.message);
        return;
    }

    const joinedCommunities = profile.joined_communities || [];

    if (joinedCommunities.includes(communityID)) {
        alert("You are already a member of this community.");
        return;
    }

    joinedCommunities.push(communityID);

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ joined_communities: joinedCommunities })
        .eq('id', user.id);

    if (updateError) {
        console.error("Error updating joined communities:", updateError.message);
        alert("Failed to join the community. Please try again.");
    } else {
        alert("Successfully joined the community!");
    }
});

showCurrentUser();