// Dependencies

import { supabase } from "./supabase.js?v=msx5ymzr";
import { PAGE_URLS, withLoadingOverlay, withTimeout } from "./main.js?v=msx5ymzr";
import {
  clearPendingAccountLanguage,
  getLanguage,
  hasPendingAccountLanguage,
} from "./i18n.js?v=msx5ymzr";

// Definitions

const loginForm = document.getElementById("loginForm");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const emailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const errorMessage = document.getElementById("error-message");

// Events

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    errorMessage.textContent = "Please fill in all fields.";
    return;
  }

  await withLoadingOverlay(async () => {
    let authResult;
    try {
      authResult = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        20000,
        "Sign-in took too long.",
      );
    } catch (requestError) {
      console.error("Sign-in request failed:", requestError.message);
      errorMessage.textContent = "Unable to reach Bloom. Check your connection and try again.";
      return;
    }
    const { data: authData, error } = authResult;
    if (error) {
      console.error("Error signing in:", error.message);
      errorMessage.textContent = "Error signing in: " + error.message;
      return;
    }

    if (hasPendingAccountLanguage()) {
      const { error: languageError } = await supabase
        .from("profiles")
        .update({ Language: getLanguage() })
        .eq("id", authData.user.id);
      if (languageError) {
        console.error("Unable to sync the selected language:", languageError.message);
      } else {
        clearPendingAccountLanguage();
      }
    }

    let profile = null;
    let profileError = null;
    try {
      const profileResult = await withTimeout(
        supabase
          .from("profiles")
          .select("isBusiness")
          .eq("id", authData.user.id)
          .single(),
        15000,
        "Account lookup took too long.",
      );
      profile = profileResult.data;
      profileError = profileResult.error;
    } catch (requestError) {
      profileError = requestError;
    }

    if (profileError) {
      console.error("Unable to determine account type:", profileError.message);
    }

    window.location.href = profile?.isBusiness === true
      ? PAGE_URLS.businessHome
      : PAGE_URLS.home;
  }, "Signing in...");
});

forgotPasswordButton?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email || !emailInput.checkValidity()) {
    errorMessage.textContent = "Enter your email address first.";
    emailInput.focus();
    return;
  }
  await withLoadingOverlay(async () => {
    const redirectTo = new URL("../reset-password/", window.location.href).href;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error("Error requesting password reset:", error.message);
      errorMessage.textContent = "Unable to send a password reset email. Please try again.";
      return;
    }
    errorMessage.textContent = "If an account exists for that email, a reset link has been sent.";
  }, "Sending reset link...");
});
