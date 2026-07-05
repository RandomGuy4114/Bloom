import { supabase } from './supabase.js';

const { data: { user }, error } = await supabase.auth.getUser();

// DOM elements
const postsContainer = document.getElementById('communities-container');
const myCommunitiesContainer = document.getElementById('my-communities-container');

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
        .eq('owner', user.id); // Assuming you have a way to get the current user's ID

    if (error) {
        console.error('Error fetching my communities:', error.message);
        return;
    }

    displayMyCommunities(communities);
}

// Display communities in the DOM
function displayCommunities(communities) {
    postsContainer.innerHTML = ''; // Clear existing content

    communities.forEach(community => {
        const communityElement = document.createElement('div');
        communityElement.classList.add('community');

        communityElement.innerHTML = `
            <h2>${community.name}</h2>
            <p>${community.description}</p>
            <p>Members: ${community.members.length || 0}</p>
            <div class="com-buttons">
                <button style="padding: 10px; margin: 5px;">View Community</button>
                <button style="padding: 10px; margin: 5px;">Join Community</button>
            </div>
        `;

        postsContainer.appendChild(communityElement);
    });
}

function displayMyCommunities(communities) {
    myCommunitiesContainer.innerHTML = ''; // Clear existing content

    communities.forEach(community => {
        const communityElement = document.createElement('div');
        communityElement.classList.add('community');

        communityElement.innerHTML = `
            <h2>${community.name}</h2>
            <p>${community.description}</p>
            <p>Members: ${community.members.length || 0}</p>
            <div class="com-buttons">
                <button style="padding: 10px; margin: 5px;">View Community</button>
                <button style="padding: 10px; margin: 5px;">Leave Community</button>
            </div>
        `;

        myCommunitiesContainer.appendChild(communityElement);
    });
}

fetchMyCommunities();
fetchCommunities();