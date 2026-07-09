import { supabase } from "./supabase.js";
import {
  createPostCard,
  formatDateTime,
  getCommunityNameFromID,
  getCurrentUserOrRedirect,
  getUserProfile,
  renderEmptyState,
} from "./main.js";

// DOM Elements
const usernameLabel = document.getElementById("username-label");
const feed = document.getElementById("feed");
const communitySelect = document.getElementById("communitySelect");
const titleInput = document.getElementById("titleInput");
const postInput = document.getElementById("postInput");
const createPostButton = document.getElementById("createPostButton");

let currentUser = null;
let joinedCommunities = [];

function createFeedCard({ title, body, communityName, authorName, createdAt }) {
  const card = createPostCard({
    title,
    body,
    footer: `Posted on: ${formatDateTime(createdAt)}`,
  });

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.marginBottom = "10px";
  header.style.gap = "10px";
  header.style.flexWrap = "wrap";
  header.innerHTML = `
    <div class="pfp-frame" style="width: 30px; height: 30px;"></div>
    <strong style="color: #618764;">${authorName}</strong>
    <span style="color: #888; font-size: 0.85rem;">in ${communityName}</span>
  `;

  card.insertBefore(header, card.firstChild);
  return card;
}

async function populateCommunitySelect(selectedCommunityId = null) {
  communitySelect.innerHTML = "";

  if (!joinedCommunities.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Join a community to post";
    communitySelect.appendChild(option);
    communitySelect.disabled = true;
    return;
  }

  communitySelect.disabled = false;

  for (const communityID of joinedCommunities) {
    const communityName = await getCommunityNameFromID(communityID);
    if (communityName) {
      const option = document.createElement("option");
      option.value = communityID;
      option.textContent = communityName;
      if (selectedCommunityId ? communityID === selectedCommunityId : communityID === joinedCommunities[0]) {
        option.selected = true;
      }
      communitySelect.appendChild(option);
    }
  }
}

async function renderFeedPosts(posts) {
  feed.innerHTML = "";

  if (!posts || posts.length === 0) {
    renderEmptyState(feed, "No posts yet. Join a community or write the first update.");
    return;
  }

  for (const post of posts) {
    const communityName = await getCommunityNameFromID(post.community) || "Unknown Community";
    const card = createFeedCard({
      title: post.title,
      body: post.body,
      communityName,
      authorName: post.author === currentUser.id ? "You" : "Community Member",
      createdAt: post.created_at,
    });
    feed.appendChild(card);
  }
}

async function getJoinedCommunities() {
  const { data: communities, error } = await supabase
    .from("profiles")
    .select("joined_communities")
    .eq("id", currentUser.id);

  if (error) {
    console.error("Error fetching joined communities:", error.message);
    renderEmptyState(feed, "Unable to load your feed right now.");
    return;
  }

  joinedCommunities = communities?.[0]?.joined_communities ?? [];

  if (!joinedCommunities.length) {
    console.log("No joined communities found.");
    postInput.placeholder = "Join a community to start posting";
    postInput.disabled = true;
    createPostButton.disabled = true;
    communitySelect.disabled = true;
    await populateCommunitySelect();
    renderEmptyState(feed, "Join a community to see posts here.");
    return;
  }

  postInput.disabled = false;
  createPostButton.disabled = false;
  postInput.placeholder = "Post Content";
  await populateCommunitySelect(communitySelect.value);

  const { data: posts, error: postsError } = await supabase
    .from("Posts")
    .select("*")
    .in("community", joinedCommunities)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching posts from joined communities:", postsError.message);
    renderEmptyState(feed, "Unable to load your feed right now.");
    return;
  }

  console.log("Feed posts fetched successfully, yay!");
  await renderFeedPosts(posts);
}

async function post() {
  const title = titleInput.value.trim();
  const body = postInput.value.trim();
  const selectedCommunity = communitySelect.value;

  if (!title) {
    alert("Please add a post title before posting.");
    return;
  }

    if (!body) {
        alert("Please write something before posting.");
        return;
    }

    if (!joinedCommunities.length) {
        alert("Join a community before posting.");
        return;
    }

    if (!selectedCommunity) {
      alert("Please choose a community to post to.");
      return;
    }

    const { data, error } = await supabase
        .from("Posts")
      .insert([{ title, body, author: currentUser.id, community: selectedCommunity }]);

    if (error) {
        console.error("Error creating post:", error.message);
        alert("Error creating post. Please try again.");
    } else {
        console.log("Post created successfully:", data);
      titleInput.value = "";
        postInput.value = "";
        await getJoinedCommunities();
    }
}

createPostButton.addEventListener("click", post);

postInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        post();
    }
});

async function initializeHomePage() {
  currentUser = await getCurrentUserOrRedirect();

  if (!currentUser) {
    return;
  }

  const profile = await getUserProfile(currentUser.id);
  if (profile?.username) {
    usernameLabel.textContent = profile.username;
  }

  await getJoinedCommunities();
}

initializeHomePage();