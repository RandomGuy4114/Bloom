# Bloom
Bloom is an open-source, location-based social platform designed to bring communities together. By locking communities, events, and interactions to a specific geographic location, Bloom makes it effortless to connect with the people near you, whether it's an apartment building, school campus, or neighborhood.

## Key Features
* **Local Communities:** Discover and join spaces entirely dedicated to your surroundings. You can only interact with what is near you.
* **Geofenced Events:** Host meetups, block parties, or garage sales that are only visible to locals.
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
You can also donate to my ko-fi to help support the project.
[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/FormalBlaze)
