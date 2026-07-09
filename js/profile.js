import { supabase } from "./supabase.js";
import { createPostCard, formatDateTime, getCurrentUserOrRedirect, getUserProfile, renderEmptyState } from "./main.js";

const usernameLabel = document.getElementById("username-label");
const profileName = document.querySelector(".profile-name");
const profileDetails = document.querySelector(".profile-details");
const postsContainer = document.querySelector(".posts-container");

async function loadProfile() {
	const user = await getCurrentUserOrRedirect();

	if (!user) {
		return;
	}

	const profile = await getUserProfile(user.id);

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

	const { data: posts, error: postsError } = await supabase
		.from("Posts")
		.select("title, body, created_at")
		.eq("author", user.id)
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

	for (const post of posts) {
		postsContainer.appendChild(
			createPostCard({
				title: post.title,
				body: post.body,
				footer: `Posted on: ${formatDateTime(post.created_at)}`,
			})
		);
	}
}

loadProfile();
