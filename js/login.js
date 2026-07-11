// Dependencies

import { supabase } from "./supabase.js";
import { PAGE_URLS, withLoadingOverlay } from "./main.js";

// Definitions

const loginButton = document.getElementById("LoginButton");
const emailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const errorMessage = document.getElementById("error-message");

// Events

loginButton?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorMessage.textContent = "Please fill in all fields.";
    return;
  }

  await withLoadingOverlay(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Error signing in:", error.message);
      errorMessage.textContent = "Error signing in. Please check your credentials and try again.";
      return;
    }

    window.location.href = PAGE_URLS.home;
  }, "Signing in...");
});
