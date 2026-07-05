// Motion.js
import { animate } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm"


// Supabase

import { supabase } from "./supabase.js";
const { data: { user }, error } = await supabase.auth.getUser();

if (error) {
  console.error("Error fetching user:", error.message);
  window.location.href = "login.html"; // Redirect to login page if there's an error
} else {
  console.log("Logged In Successfully, yay!");
}

// DOM Elements
const usernameLabel = document.getElementById("username-label");
const postsContainer = document.getElementById("posts-container");
const feed = document.getElementById("feed");
const communitySelect = document.getElementById("communitySelect");
const createPostPopup = document.getElementById("createPostPopup");
const closePopupButton = document.getElementById("closePopupButton");
const popupOverlay = document.getElementById("popupOverlay");
// Functions
async function animatePopup(direction, popupElement) {
    if (direction === "in") {
        popupElement.style.display = "flex";
        popupOverlay.style.display = "flex";
        animate(popupOverlay, { opacity: [0, 1]}, { duration: 0.3 });
        await animate(popupElement, { opacity: [0, 1], scale: [0.8, 1], y: [20, 0] }, { duration: 0.3 });
    } else if (direction === "out") {
        animate(popupOverlay, { opacity: [1, 0]}, { duration: 0.3 });
        await animate(popupElement, { opacity: [1, 0], scale: [1, 0.8], y: [0, 20] }, { duration: 0.3 });
        popupElement.style.display = "none";
        popupOverlay.style.display = "none";
    }
}


async function getCommunityNameFromID(communityID) {
  const { data: community, error } = await supabase
    .from("Communities")
    .select("name")
    .eq("id", communityID)
    .single();

  if (error) {
    console.error("Error fetching community name:", error.message);
    return null;
  } else {
    return community.name;
  }
}

async function getUserProfile() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
    
  if (error) {
    console.error("Error fetching user profile:", error.message);
    window.location.href = "login.html"; // Redirect to login page if there's an error
  } else {
    console.log("User profile fetched successfully, yay!");
    usernameLabel.textContent = profile.username; // Update the username label with the fetched username
  }
}

async function getUserPosts() {
    postsContainer.innerHTML = ""; // Clear existing posts
  const { data: posts, error } = await supabase
    .from("Posts")
    .select("*")
    .eq("author", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user posts:", error.message);
  } else {
    console.log("User posts fetched successfully, yay!");
    const postElements = posts.map(post => {
      const postElement = document.createElement("div");
      postElement.classList.add("post");
      postElement.innerHTML = `
        <h2>${post.title}</h2>
        <p>${post.body}</p>
        <p style="font-size: 12px; color: grey;">Posted on: ${new Date(post.created_at).toLocaleString()} In ${post.communityName}</p>
      `;
      return postElement;
    });
    postElements.forEach(postElement => postsContainer.appendChild(postElement));
  }
}

async function getJoinedCommunities() {
    const { data: communities, error } = await supabase
        .from("profiles")
        .select("joined_communities")
        .eq("id", user.id);

        if (error) {
        console.error("Error fetching joined communities:", error.message);
    } else {
        console.log("Joined communities fetched successfully, yay!");
        const { data: posts, error: postsError } = await supabase
        .from("Posts")
        .select("*")
        .in("community", communities[0].joined_communities)
        .order("created_at", { ascending: false });

        if (postsError) {
            console.error("Error fetching posts from joined communities:", postsError.message);
        } else {
            console.log("Posts from joined communities fetched successfully, yay!");
            const feedElements = posts.map(post => {
                const feedElement = document.createElement("div");
                feedElement.classList.add("post");
                feedElement.innerHTML = `
                    <h2>${post.title}</h2>
                    <p>${post.body}</p>
                    <p style="font-size: 12px; color: grey;">Posted on: ${new Date(post.created_at).toLocaleString()} in ${post.community}</p>
                `;
                return feedElement;
            });
            feedElements.forEach(feedElement => feed.appendChild(feedElement));
            communitySelect.innerHTML = ""; // Clear existing options
            communities[0].joined_communities.forEach(async (communityID) => {
                const communityName = await getCommunityNameFromID(communityID);
                if (communityName) {
                    const option = document.createElement("option");
                    option.value = communityID;
                    option.textContent = communityName;
                    communitySelect.appendChild(option);
                }
            });
        }
    }
}

async function post() {
    const title = document.getElementById("postTitle").value;
    const body = document.getElementById("postContent").value;
    const communityID = communitySelect.value;

    if (!title || !body || !communityID) {
        alert("Please fill in all fields.");
        return;
    }

    const { data, error } = await supabase
        .from("Posts")
        .insert([{ title: title, body: body, author: user.id, community: communityID }]);

    if (error) {
        console.error("Error creating post:", error.message);
        alert("Error creating post. Please try again.");
    } else {
        console.log("Post created successfully:", data);
        // Optionally, you can refresh the posts or redirect the user to a different page after successful post creation
        window.location.reload(); // Refresh the page to show the new post
    }
}

document.getElementById("submitPostButton").addEventListener("click", post);

getUserProfile();
getUserPosts();
getJoinedCommunities();

document.getElementById("createPostButton").addEventListener("click", () => {
    animatePopup("in", createPostPopup);
});

closePopupButton.addEventListener("click", () => {
    animatePopup("out", createPostPopup);
});