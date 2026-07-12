// Dependencies

import { supabase } from "./supabase.js";
import { PAGE_URLS, withLoadingOverlay } from "./main.js";

// Definitions

const registerButton = document.getElementById("LoginButton");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const emailInput = document.getElementById("email");
const birthdayInput = document.getElementById("birthday");
const errorMessage = document.getElementById("error-message");

// Functions

function checkAge(birthday) {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 13;
}


// Events

registerButton?.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const email = emailInput.value.trim();
  const birthday = birthdayInput.value;

  if (!username || !password || !email || !birthday) {
    errorMessage.textContent = "Please fill in all fields.";
    return;
  }

  if (!checkAge(birthday)) {
    errorMessage.textContent = "You must be at least 13 years old to create an account.";
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errorMessage.textContent = "Username can only contain letters, numbers, and underscores.";
    return;
  }

  await withLoadingOverlay(async () => {
    const { data: usernameAvailable, error: existingUserError } = await supabase
      .rpc("is_username_available", { requested_username: username });

    if (existingUserError) {
      console.error("Error checking existing user:", existingUserError.message);
      errorMessage.textContent = "Unable to check that username. Please try again.";
      return;
    }
    if (!usernameAvailable) {
      errorMessage.textContent = "Username already exists. Please choose a different username.";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        emailRedirectTo: "https://trybloom.org/pages/auth/confirm",
        data: { 
          username,
          display_name: username,
          birthday 
        } 
      },
    });

    if (error) {
      console.error("Error signing up:", error.message);
      errorMessage.textContent = "Error signing up. Please try again.";
      return;
    }

    alert("Account created successfully! Please check your email to confirm your account.");
    window.location.href = PAGE_URLS.index;
  }, "Creating your account...");
});
