# Bloom
Bloom is an open-source, location-based social platform designed to bring communities together. By locking communities, events, and interactions to a specific geographic location, Bloom makes it effortless to connect with the people near you, whether it's an apartment building, school campus, or neighborhood.

## Key Features
* **Local Communities:** Discover and join spaces entirely dedicated to your surroundings. You can only interact with what is near you.
* **Geofenced Events:** Host meetups, block parties, or garage sales that are only visible to locals.
* **Secure Direct Messaging:** Connect safely. Direct messaging is limited to the people near you, keeping your inbox relevant and secure.
* **Community Tools:** Keep your neighborhood informed and engaged with polls, events, and more!

## Getting Started

### Main Usage
Bloom is available as a website for now, mobile support does work, but there isn't a full app for mobile (Yet!) [Website Link Here]

Bloom's source code contains everything except the API. So you can help with the development of Bloom or even make your own version (note that you will have to set up your own API for this, I do not allow "Clients" for Bloom.)

### Self Hosting
Self-hosting is highly encouraged for advanced users, and it's as easy as replacing the API that comes with Bloom with your own. (This is most easily done by using Supabase, which is the service I use for Bloom.)

#### Step 1: Setting Up The Frontend

1. Clone the repository using your preffered method.

2. Create a js file called ```supabase.js``` inside the "js" folder, and populate it with this.
```

import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Do not change this for now.
export const supabase = createClient(
  "Your Supabase URL", 
  "Your Supabase ANON KEY"
);
```

#### Step 2: Creating The Backend

1. Create or log into a supabase account [here](https://supabase.com/)
2. Create a new project with your organization and project details, make sure you save your project password somewhere secure.

Now that you have created your backend, grab the ```Project Url``` And ```Anon public``` keys, after that, replace the URL and the ANON KEY lines in the ```supabase.js``` file with the new keys from your Backend.

#### Step 3: Structuring The Backend
Now that you have your backend created, grab the code inside ```supabase/schema.sql``` and paste it into the ```SQL EDITOR``` in supabase.

Your backend should now be done! If you have any issues, feel free to make a bug report!

## The Future and What's To Come
I have big plans for Bloom, so the future for this service is very bright. The list below will show some features I would like to add to Bloom (which you can help on making!)

[List goes here]

## Contributing
Bloom is completely **Open Source**. Contributions, bug reports, and feature requests are all welcome. Feel free to check the issues page or open a pull request.

---

## Running Locally with Docker

The instructions above describe the original setup, where you point Bloom at a Supabase project hosted in the cloud. This section covers an alternative that runs **everything on your own machine** — the static frontend *and* a full local Supabase backend — inside Docker. After a one-time image download it works completely offline.

### What you'll need
* [Docker](https://www.docker.com/) (Docker Desktop, or the engine plus the Compose plugin) — installed and running.
* [Node.js](https://nodejs.org/) and npm, used only to install the Supabase CLI.

### Quick start
From the project root:

```bash
npm install      # installs the Supabase CLI (a devDependency)
./launch.sh      # starts the backend + frontend and opens your browser
```

`launch.sh` will:
1. Start the local Supabase stack (`supabase start`) and apply the database schema.
2. Build and start the frontend in an nginx container.
3. Wait for the site to respond, then open it in your browser.

> **Note:** The very first run downloads the Docker images (the frontend image plus the Supabase services), so it needs an internet connection once. Every run after that is fully offline.

### Local URLs
Once it's up:

| Service | URL | Purpose |
| --- | --- | --- |
| Site | http://localhost:8080/Site/index.html | The Bloom frontend |
| Supabase Studio | http://127.0.0.1:54323 | Browse and edit the local database |
| Email inbox | http://127.0.0.1:54324 | Sign-up / login emails land here (nothing is sent for real) |
| Supabase API | http://127.0.0.1:54321 | The local backend endpoint |

### Useful commands

```bash
BLOOM_PORT=9000 ./launch.sh   # serve the frontend on a different port
./launch.sh --frontend-only   # skip the local backend and use the hosted one

docker compose down           # stop the frontend
npx supabase stop             # stop the backend
npx supabase db reset         # wipe the local database and re-apply supabase/schema.sql
```

### How the backend is chosen
You no longer need to hand-create `js/supabase.js` for local development — it now ships in the repo and picks its backend automatically:

* Opened on **localhost** → talks to the **local** Supabase stack (`http://127.0.0.1:54321`).
* Opened **anywhere else** → talks to the **hosted** Supabase project.

To use your own hosted project, replace the URL and anon key in the `hosted` section of `js/supabase.js`. The schema lives in `supabase/migrations/` (applied automatically to the local database) and remains available at `supabase/schema.sql` for pasting into a hosted project's SQL editor.

> The Supabase JS SDK is vendored at `js/vendor/supabase-umd.js` and loaded by each page, so the browser doesn't fetch it from a CDN — this is what makes offline use possible.