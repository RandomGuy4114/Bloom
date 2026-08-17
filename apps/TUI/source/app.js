
// React and Ink imports
import React, { useState, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useScreenSize } from 'fullscreen-ink';

// Supabase client import
import { createClient } from '@supabase/supabase-js';

// Node.js imports
import fs from 'fs';
import path from 'path';
import os from 'os';

// Path to the session file
const sessionPath = path.join(os.homedir(), '.bloomtui', 'session.json');

const fileStorage = {
  getItem: (key) => {
    try {
      const raw = fs.readFileSync(sessionPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed[key] ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    } catch {}
    data[key] = value;
    fs.writeFileSync(sessionPath, JSON.stringify(data), 'utf-8');
  },
  removeItem: (key) => {
    try {
      const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      delete data[key];
      fs.writeFileSync(sessionPath, JSON.stringify(data), 'utf-8');
    } catch {}
  },
};

// Supabase client initialization
const supabase = createClient(
  "https://auilmosognuitlpoqchn.supabase.co",
  "sb_publishable_tk45nARRDwS9I4iLJ-8KbA_iqq_avnG",
  {
    auth: {
      storage: fileStorage,
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

// Fake location, since the TUI doesn't implement nearby communities.
const FAKE_LOCATION = {
  city: 'San Francisco',
  region: 'CA',
  country: 'United States',
  latitude: 37.7749,
  longitude: -122.4194,
};


// React component for the TUI application
export default function App() {

  // State variables for the application
  const sites = ["Home", "Communities", "Post Creator"];
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  // State variables for login
  const [loginState, setLoginState] = useState("email");
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [mainState, setMainState] = useState("loading");
  
  // State variables for navigation and selection
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSite, setSelectedSite] = useState(null);
  const [sidebarSelected, setSidebarSelected] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(true);

  // State variables for elements
  const [ posts, setPosts ] = useState([]);
  const [ postsError, setPostsError ] = useState(null);
  const [ postScroll, setPostScroll ] = useState(0);
  const POSTS_PER_PAGE = 3;

  const [location] = useState(FAKE_LOCATION);

  const handleNext = () => {
    setSelectedIndex((prevIndex) => (prevIndex + 1) % sites.length);
  };

  const handlePrev = () => {
    setSelectedIndex((prevIndex) => (prevIndex - 1 + sites.length) % sites.length);
  };

  const handleEmailSubmit = async () => {
    if (email.trim()) setLoginState('password');
  }

  const handlePasswordSubmit = async () => {
    setLoginState('loading');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoginState('email');
      setError(error.message);
    }
  }
  // Input Handler
  useInput((input, key) => {
    if (buttonsEnabled) {
      if (key.upArrow) {
        if (sidebarSelected) {
          handlePrev();
        } else if (selectedSite === "Home") {
          setPostScroll((prev) => Math.max(prev - 1, 0));
        }
      } else if (key.downArrow) {
        if (sidebarSelected) {
          handleNext();
        } else if (selectedSite === "Home") {
          setPostScroll((prev) => Math.min(prev + 1, Math.max(posts.length - POSTS_PER_PAGE, 0)));
        }
      } else if (key.return && selectedSite !== "No user") {
          setSelectedSite(sites[selectedIndex]);
          setSidebarSelected(false);
      }
    }
    if (key.tab) {
      setSidebarSelected(!sidebarSelected);
    }
  });

  useEffect(() => {
    const loadData = async () => {
      setButtonsEnabled(false);
      const { data, error } = await supabase.auth.getUser();
      if (error && error.name !== "AuthSessionMissingError") {
        console.error("Supabase error:", error);
        setSelectedSite("Error: " + error.message);

        return;
      }
      const { data: userData, error: userError } = await supabase.from('profiles').select('*').eq('id', data.user?.id).single();
      setUser(data.user);
      setUserData(userData);
      setMainState("loaded");
      setSelectedSite(data.user ? "landing" : "No user");
      if (data.user) {
        setButtonsEnabled(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSite !== "Home") return;

    const loadPosts = async () => {
      const { data, error } = await supabase.rpc('get_home_feed', {
        user_latitude: location.latitude,
        user_longitude: location.longitude,
        feed_limit: 50,
      });

      if (error) {
        setPostsError(error.message);
        return;
      }
      setPostsError(null);
      setPosts(data ?? []);
      setPostScroll(0);
    };
    loadPosts();
  }, [selectedSite]);

  return (
    <Box flexDirection="column" alignItems="flex-start" height="100%" width="100%">
      <Box flexDirection="row" alignItems="center" justifyContent="center" width="100%" borderColor="white" borderStyle="single" padding={1}>
        <Text>BloomTUI </Text>
        <Text>0.0.1</Text>
      </Box>
      <Box flexDirection="row" height="100%" width="100%">
        <Box flexDirection="column" alignItems="center" width="20%" justifyContent="flex-start" height="100%" borderColor={sidebarSelected ? "greenBright" : "white"} borderStyle="single">
          <Box width="100%" alignItems="center" justifyContent="center" borderColor={selectedIndex === 0 ? buttonsEnabled ? "cyanBright" : "gray" : buttonsEnabled ? "white" : "gray"} borderStyle="single">
            <Text>Home</Text>
          </Box>
          <Box width="100%" alignItems="center" justifyContent="center" borderColor={selectedIndex === 1 ? "cyanBright" : buttonsEnabled ? "white" : "gray"} borderStyle="single">
            <Text>Communities</Text>
          </Box>
          <Box width="100%" alignItems="center" justifyContent="center" borderColor={selectedIndex === 2 ? "cyanBright" : buttonsEnabled ? "white" : "gray"} borderStyle="single">
            <Text>Post Creator</Text>
          </Box>
        </Box>
        <Box width="100%" flexDirection="column" alignItems="center" justifyContent="center" height="100%" borderColor={sidebarSelected ? "white" : "greenBright"} borderStyle="single" padding={1}>
          {mainState === "loading" && (
            <Text color="gray">Loading...</Text>
          )}
          {selectedSite == "No user" && mainState === "loaded" && (
            <>
              <Text color="green">Welcome to Bloom!</Text>
              <Text color="gray">Please log in to continue.</Text>
              <Box flexDirection="column" alignItems="center" justifyContent="center" marginTop={1}>
                <Box borderColor={'white'} borderStyle="single" padding={1} marginBottom={1} width={40}>
                  <Text>Email: </Text>
                  <TextInput value={email} onSubmit={handleEmailSubmit} onChange={setEmail} focus={loginState === "email"} />
                </Box>
                <Box borderColor={'white'} borderStyle="single" padding={1} width={40}>
                  <Text>Password: </Text>
                  <TextInput value={password} onSubmit={handlePasswordSubmit} onChange={setPassword} mask="*" focus={loginState === "password"} />
                </Box>
                <Text color={error ? "red" : "gray"}>{loginState === "loading" ? "Logging you in..." : error ? error : ""}</Text>
              </Box>
            </>
          )}
          {selectedSite === "landing" && mainState === "loaded" && (
            <>
              <Text color="green">Welcome back, </Text><Text>{userData?.display_name}</Text>
              <Text color="gray">Use tab to navigate to the sidebar, and the arrow keys to navigate the content.</Text>
            </>
          )}
          {selectedSite === "Home" && mainState === "loaded" && (
            <Box flexDirection="column" alignItems="flex-start" width="100%" flexShrink={0}>
              {postsError && <Text color="red">Error: {postsError}</Text>}
              {!postsError && posts.length === 0 && (
                <Text color="gray">No posts yet.</Text>
              )}
              {posts.slice(postScroll, postScroll + POSTS_PER_PAGE).map((post) => (
                <Box key={post.id} flexDirection="column" alignItems="flex-start" borderColor="white" borderStyle="single" padding={1} marginTop={1} width="100%" flexShrink={0}>
                  <Text bold>{post.title}</Text>
                  <Text color="gray">{post.body}</Text>
                  <Text color="gray">By {post.author_name} in {post.community_name}</Text>
                </Box>
              ))}
              {posts.length > 0 && (
                <Text color="gray">
                  {postScroll + 1}-{Math.min(postScroll + POSTS_PER_PAGE, posts.length)} of {posts.length} (↑/↓ to scroll)
                </Text>
              )}
            </Box>
          )}
          {selectedSite === "Communities" && mainState === "loaded" && (
            <>
              <Text color="green">Communities</Text>
              <Text color="gray">This is the communities page.</Text>
            </>
          )}
          {selectedSite === "Post Creator" && mainState === "loaded" && (
            <>
              <Text color="green">Post Creator</Text>
              <Text color="gray">This is the post creator page.</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}