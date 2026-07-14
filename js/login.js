// Dependencies

import { supabase } from "./supabase.js";
import { PAGE_URLS, withLoadingOverlay } from "./main.js";

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
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Error signing in:", error.message);
      errorMessage.textContent = "Error signing in. Please check your credentials and try again.";
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("isBusiness")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("Unable to determine account type:", profileError.message);
      await supabase.auth.signOut();
      errorMessage.textContent = "Unable to load your account. Please try again.";
      return;
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
