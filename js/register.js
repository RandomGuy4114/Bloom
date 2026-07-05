import { supabase } from "./supabase.js";

document.getElementById("LoginButton").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const email = document.getElementById("email").value;
  const errorMessageElement = document.getElementById("error-message");

  if (!username || !password || !email) {
    errorMessageElement.textContent = "Please fill in all fields.";
    return;
  }

  // Check for existing user with the same username
  const { data: existingUser, error: existingUserError } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();
    
  if (existingUserError) {
    console.log("Error checking existing user:", existingUserError.message);
    return;
  }

  if (existingUser) {
    errorMessageElement.textContent = "Username already exists. Please choose a different username.";
    return;
  }

  // Sign up the user with Supabase
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: { emailRedirectTo: "http://localhost:3000/Site/confirm.html" },
    data: { username: username }
  });

  if (error) {
    console.log("Error signing up:", error.message);
    errorMessageElement.textContent = "Error signing up. Please try again.";
  } else {
    // Create The Users Profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert([{ id: data.user.id, username: username, display_name: username, bio: "", avatar_url: "" }]);
    if (profileError) {
      console.log("Error creating profile:", profileError.message);
      errorMessageElement.textContent = "Error creating profile. Please try again.";
    } else {
      console.log("User signed up and profile created successfully:", data, profileData);
      window.location.href = "home.html"; // Redirect to home page
    }
  }
});