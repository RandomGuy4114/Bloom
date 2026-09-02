// Dependencies

import { supabase } from "./supabase.js?v=mtk6ih8q";
import { PAGE_URLS, withLoadingOverlay } from "./main.js?v=mtk6ih8q";

// Definitions

const registerForm = document.getElementById("registerForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const emailInput = document.getElementById("email");
const birthdayInput = document.getElementById("birthday");
const errorMessage = document.getElementById("error-message");
const termsAcceptedInput = document.getElementById("termsAccepted");

// Functions

function checkAge(birthday) {
  return birthday >= oldestAllowedBirthday() && birthday <= thirteenYearsAgo();
}

function thirteenYearsAgo() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 13);
  return formatDateInput(date);
}

function oldestAllowedBirthday() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 120);
  return formatDateInput(date);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Events

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const email = emailInput.value.trim();
  const birthday = birthdayInput.value;

  if (!username || !password || !email || !birthday || !termsAcceptedInput.checked) {
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
    const { data: moderation, error: moderationError } = await supabase.functions.invoke("moderate-username", {
      body: { username },
    });
    if (moderationError || moderation?.approved !== true) {
      errorMessage.textContent = "That username does not meet the community guidelines. Please choose another one.";
      return;
    }

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
        emailRedirectTo: new URL("../confirm/", window.location.href).href,
        data: { 
          username,
          display_name: username,
          birthday,
          accepted_terms: true,
          terms_version: "2026-07-13",
          terms_accepted_at: new Date().toISOString(),
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

// Initialization

birthdayInput.max = thirteenYearsAgo();
birthdayInput.min = oldestAllowedBirthday();
