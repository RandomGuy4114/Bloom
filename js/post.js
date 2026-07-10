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
const usernameLabel = document.getElementById('username-label');

if (!user) {
    throw new Error('Unable to load communities without a logged-in user.');
}

async function showCurrentUser() {
    if (!usernameLabel) {
        return;
    }

    const profile = await getUserProfile(user.id);
    usernameLabel.textContent = profile?.username || user.email || 'Logged in user';
}

showCurrentUser();

async function loadPost() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("postId");

    if (!postId) {
        console.error("No postId provided in the URL.");
        renderEmptyState(document.getElementById('post'), "No post selected.");
        return;
    }

    const { data: post, error: postError } = await supabase
        .from('Posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (postError) {
        console.error("Error fetching post:", postError.message);
        renderEmptyState(document.getElementById('post'), "Unable to load post details.");
        return;
    }

    document.getElementById('postTitle').textContent = post.title || "Untitled Post";
    document.getElementById('postContent').textContent = post.body || "No content available.";
}

loadPost();

document.getElementById('editPostButton').addEventListener('click', () => {
    const postId = new URLSearchParams(window.location.search).get('postId');
    if (postId) {
        window.location.href = `edit-post.html?postId=${postId}`;
    } else {
        alert("Post ID not found.");
    }
});

document.getElementById('deletePostButton').addEventListener('click', async () => {
    const postId = new URLSearchParams(window.location.search).get('postId');
    if (!postId) {
        alert("Post ID not found.");
        return;
    }

    const confirmation = confirm("Are you sure you want to delete this post?");
    if (!confirmation) {
        return;
    }

    const { error } = await supabase
        .from('Posts')
        .delete()
        .eq('id', postId);

    if (error) {
        console.error("Error deleting post:", error.message);
        alert("Failed to delete the post. Please try again.");
    } else {
        alert("Post deleted successfully.");
        window.location.href = "home.html"; // Redirect to home or another page after deletion
    }
});