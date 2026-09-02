// Dependencies

import { supabase } from "./supabase.js?v=mtk6ih8q";
import { PAGE_URLS, withLoadingOverlay } from "./main.js?v=mtk6ih8q";

// Definitions

const form = document.getElementById("resetPasswordForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const errorMessage = document.getElementById("error-message");

// Events

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = newPasswordInput.value;
  if (password !== confirmPasswordInput.value) {
    errorMessage.textContent = "Passwords do not match.";
    return;
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    errorMessage.textContent = "Use at least 8 characters with uppercase, lowercase, and a number.";
    return;
  }
  await withLoadingOverlay(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      errorMessage.textContent = "This password reset link is invalid or has expired.";
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error("Error resetting password:", error.message);
      errorMessage.textContent = "Unable to update your password. Request a new reset link.";
      return;
    }
    await supabase.auth.signOut();
    window.location.href = PAGE_URLS.login;
  }, "Updating password...");
});
