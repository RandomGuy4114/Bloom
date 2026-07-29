// Dependencies

import { supabase } from "./supabase.js";
import { PAGE_URLS, withLoadingOverlay } from "./main.js";

// Definitions

const form = document.getElementById("registerForm");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const birthdayInput = document.getElementById("birthday");
const termsInput = document.getElementById("termsAccepted");
const errorMessage = document.getElementById("error-message");
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const usernamePattern = /^[a-zA-Z0-9_]+$/;

// Functions

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function birthdayBoundary(yearsAgo) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsAgo);
  return formatDateInput(date);
}

function setError(message) {
  errorMessage.textContent = message;
}

async function usernameIsAllowed(username) {
  const { data, error } = await supabase.functions.invoke("moderate-username", {
    body: { username },
  });
  return !error && data?.approved === true;
}

async function usernameIsAvailable(username) {
  const { data, error } = await supabase.rpc("is_username_available", {
    requested_username: username,
  });
  if (error) throw error;
  return data === true;
}

// Events

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const birthday = birthdayInput.value;

  if (!username || !email || !password || !birthday || !termsInput.checked) {
    setError("Please fill in all fields.");
    return;
  }
  if (!usernamePattern.test(username)) {
    setError("Username can only contain letters, numbers, and underscores.");
    return;
  }
  if (!passwordPattern.test(password)) {
    setError("Use at least 8 characters with uppercase, lowercase, and a number.");
    return;
  }
  if (birthday < birthdayBoundary(120) || birthday > birthdayBoundary(13)) {
    setError("You must be at least 13 years old to create an account.");
    return;
  }

  await withLoadingOverlay(async () => {
    try {
      if (!(await usernameIsAllowed(username))) {
        setError("That username does not meet the community guidelines. Please choose another one.");
        return;
      }
      if (!(await usernameIsAvailable(username))) {
        setError("Username already exists. Please choose a different username.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL("../confirm/", window.location.href).href,
          data: {
            username,
            display_name: username,
            birthday,
            account_type: "business",
            accepted_terms: true,
            terms_version: "2026-07-13",
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;

      alert("Business account created! Please check your email to confirm it.");
      window.location.href = PAGE_URLS.index;
    } catch (error) {
      console.error("Business registration failed:", error.message);
      setError("Unable to create the business account. Please try again.");
    }
  }, "Creating your business account...");
});

// Initialization

if (birthdayInput) {
  birthdayInput.min = birthdayBoundary(120);
  birthdayInput.max = birthdayBoundary(13);
}
