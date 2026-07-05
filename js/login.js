import { supabase } from "./supabase.js";

document.getElementById("LoginButton").addEventListener("click", async () => {
  const email = document.querySelector('input[placeholder="Email"]').value;
  const password = document.querySelector('input[placeholder="Password"]').value;
  const errorMessageElement = document.getElementById("error-message");
  if (!email || !password) {
    errorMessageElement.textContent = "Please fill in all fields.";
    return;
  }
  // Sign in the user with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.log("Error signing in:", error.message);
    errorMessageElement.textContent = "Error signing in. Please check your credentials and try again.";
  } else {
    console.log("User signed in successfully:", data);
    // Optionally, you can redirect the user to a different page after successful login
    window.location.href = "home.html"; // Redirect to home page
  }
});