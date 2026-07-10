import { supabase } from "./supabase.js";
import {
  createPostCard,
  formatDateTime,
  getCommunityNameFromID,
  getCurrentUserOrRedirect,
  getUserProfile,
  PopupIn,
  renderEmptyState,
  PopupOut,
  saveCurrentUser
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

async function createFeedCard({ id, title, body, communityName, authorName, createdAt }) {
  // Pass id down to ensure internal card logic can use it if needed
  const card = await createPostCard({
    id, 
    title,
    body,
    authorName, 
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
  
  if (authorName === "You") {
    const manageButton = document.createElement("button");
    manageButton.textContent = "Manage Post";
    manageButton.style.marginLeft = "auto";
    manageButton.addEventListener("click", () => {
      // FIXED: id will now correctly point to post.id
      window.location.href = `post.html?postId=${id}`; 
    });
    header.appendChild(manageButton);
  }

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
    
    // FIXED: Added id: post.id here so createFeedCard actually receives it
    const card = await createFeedCard({
      id: post.id, 
      title: post.title,
      body: post.body,
      communityName,
      authorName: post.user_id === currentUser.id ? "You" : "Community Member",
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
    .insert([{ title, body, user_id: currentUser.id, community: selectedCommunity }]);

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

async function checkFirstTimeUser() {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("FirstTimeOpen")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Error checking user profile:", error.message);
    return;
  }

  if (profile?.FirstTimeOpen) {
    const content = document.createElement("div");
    content.innerHTML = `
      <p>Welcome to Bloom! Here's a quick guide to get you started:</p>
      <ul>
        <li>Join communities that interest you.</li>
        <li>Create posts and share your thoughts.</li>
        <li>Engage with other members by commenting and liking posts.</li>
      </ul>
      <p>Enjoy your time here!</p>
    `;

    const { closePopup } = createPopupShell("Welcome to Bloom!", content);

    // Update the FirstTimeOpen flag in the database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ FirstTimeOpen: false })
      .eq("id", currentUser.id);

    if (updateError) {
      console.error("Error updating FirstTimeOpen flag:", updateError.message);
    }
  }
}

saveCurrentUser();


await initializeHomePage();

checkFirstTimeUser()

const logo = [
"  ____  _     ___   ___  __  __ ",
" | __ )| |   / _ \\ / _ \\|  \\/  |",
" |  _ \\| |  | | | | | | | |\\/| |",
" | |_) | |__| |_| | |_| | |  | |",
" |____/|_____\\___/ \\___/|_|  |_|"
].join('\n');

console.log(logo);

// Styled Text Blocks
console.log(
  "%c Welcome To The Bloom Console! %c ALPHA ",
  "background: #2563eb; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 3px 0 0 3px;",
  "background: #1e293b; color: #94a3b8; padding: 3px 8px; border-radius: 0 3px 3px 0;"
);

console.log(
  "%c  ATTENTION  %c DO NOT share any sensitive information here.",
  "background: #eab308; color: #000; font-weight: bold; padding: 2px 5px; border-radius: 3px;",
  "color: #f87171; font-weight: bold;"
);