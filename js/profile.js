import { supabase } from "./supabase.js";
import { createPostCard, formatDateTime, getCurrentUserOrRedirect, getUserProfile, renderEmptyState } from "./main.js";

const usernameLabel = document.getElementById("username-label");
const profileName = document.querySelector(".profile-name");
const profileDetails = document.querySelector(".profile-details");
const postsContainer = document.querySelector(".posts-container");

const params = new URLSearchParams(window.location.search);
const UID = params.get("uid");

async function loadProfile(initialUID) {
    // 1. Get the current logged-in user first
    const user = await getCurrentUserOrRedirect();

    if (!user) {
        return; // Redirect logic is handled inside getCurrentUserOrRedirect
    }

    // 2. Fallback: Use the logged-in user's ID if no UID was provided in the URL
    const activeUID = initialUID || user.id;

    // 3. Fetch the profile using the resolved UID
    const profile = await getUserProfile(activeUID);

    if (!profile) {
        usernameLabel.textContent = "Profile";
        profileName.textContent = "Profile";
        profileDetails.innerHTML = '<p><strong>Bio:</strong> Unable to load bio.</p>';
    } else {
        const username = profile.username || "Unknown User";
        const bio = profile.bio || "No bio yet.";

        usernameLabel.textContent = username;
        profileName.textContent = username;
        profileDetails.innerHTML = `<p><strong>Bio:</strong> ${bio}</p>`;
    }

    // 4. Fetch the posts using the resolved UID (Added 'id' to the select query)
    const { data: posts, error: postsError } = await supabase
        .from("Posts")
        .select("id, title, body, created_at") 
        .eq("user_id", activeUID)
        .order("created_at", { ascending: false });

    if (postsError) {
        console.error("Error fetching posts:", postsError.message);
        renderEmptyState(postsContainer, "Unable to load posts right now.");
        return;
    }

    postsContainer.innerHTML = "";

    if (!posts || posts.length === 0) {
        renderEmptyState(postsContainer, "No posts yet.");
        return;
    }

    // 5. Render posts and conditionally add the Edit button
    for (const post of posts) {
        // First, create the card element and store it in a variable
        const card = createPostCard({
            title: post.title,
            body: post.body,
            footer: `Posted on: ${formatDateTime(post.created_at)}`,
        });

        // Check if the logged-in user owns this profile/post
        if (activeUID === user.id) {
            const editButton = document.createElement("button");
            editButton.textContent = "Manage Post";
            editButton.className = "edit-btn"; // Optional: for styling
            editButton.addEventListener("click", () => {
                // Redirect to the edit post page with the post ID
                window.location.href = `post.html?postId=${post.id}`;
            });
            card.appendChild(editButton);
        }

        // Finally, append the completed card to the container
        postsContainer.appendChild(card);
    }
}

loadProfile(UID);