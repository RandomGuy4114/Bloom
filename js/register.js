// Dependencies

import { supabase } from "./supabase.js";
import { withLoadingOverlay } from "./main.js";

// Definitions

const registerButton = document.getElementById("LoginButton");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const emailInput = document.getElementById("email");
const errorMessage = document.getElementById("error-message");

// Events

registerButton?.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const email = emailInput.value.trim();

  if (!username || !password || !email) {
    errorMessage.textContent = "Please fill in all fields.";
    return;
  }

  await withLoadingOverlay(async () => {
    const { data: existingUser, error: existingUserError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (existingUserError) {
      console.error("Error checking existing user:", existingUserError.message);
      errorMessage.textContent = "Unable to check that username. Please try again.";
      return;
    }
    if (existingUser) {
      errorMessage.textContent = "Username already exists. Please choose a different username.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "http://localhost:3000/Site/confirm.html" },
      data: { username },
    });

    if (error) {
      console.error("Error signing up:", error.message);
      errorMessage.textContent = "Error signing up. Please try again.";
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert([{ id: data.user.id, username, display_name: username, bio: "", avatar_url: "" }]);

    if (profileError) {
      console.error("Error creating profile:", profileError.message);
      errorMessage.textContent = "Error creating profile. Please try again.";
      return;
    }

    window.location.href = "home.html";
  }, "Creating your account...");
});
