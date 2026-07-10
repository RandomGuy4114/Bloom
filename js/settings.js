import { PopupIn, PopupOut } from "./main.js";
import { supabase } from "./supabase.js";

const themeSelect = document.getElementById("themeSelect");
const changePasswordButton = document.getElementById("changePasswordButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");

const themeStorageKey = "bloom-theme";

function applyTheme(theme) {
	const activeTheme = theme === "dark" ? "dark" : "light";
	document.body.dataset.theme = activeTheme;
	if (themeSelect) {
		themeSelect.value = activeTheme;
	}
	localStorage.setItem(themeStorageKey, activeTheme);
}

function loadTheme() {
	const savedTheme = localStorage.getItem(themeStorageKey);
	applyTheme(savedTheme || "light");
}

function createPopupShell(title, content) {
	const overlay = document.createElement("div");
	overlay.className = "popup-overlay";
	overlay.innerHTML = `
		<div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="popupTitle">
			<div class="popup-header">
				<h2 id="popupTitle">${title}</h2>
				<button class="popup-close" type="button" aria-label="Close dialog">×</button>
			</div>
			<div class="popup-body"></div>
		</div>
	`;

	const card = overlay.querySelector(".popup-card");
	const body = overlay.querySelector(".popup-body");
	body.appendChild(content);

	const closeButton = overlay.querySelector(".popup-close");
	const closePopup = () => {
		overlay.classList.remove("is-visible");
		PopupOut(card, { duration: 0.2 });
		window.setTimeout(() => {
			if (overlay.parentNode) {
				overlay.parentNode.removeChild(overlay);
			}
		}, 200);
		document.removeEventListener("keydown", handleEscape);
	};

	function handleEscape(event) {
		if (event.key === "Escape") {
			closePopup();
		}
	}

	overlay.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closePopup();
		}
	});

	closeButton.addEventListener("click", closePopup);
	document.addEventListener("keydown", handleEscape);
	document.body.appendChild(overlay);
	requestAnimationFrame(() => {
		overlay.classList.add("is-visible");
		PopupIn(card, { duration: 0.2 });
	});

	return { overlay, closePopup };
}

function openChangePasswordPopup() {
	const form = document.createElement("form");
	form.className = "popup-form";
	form.innerHTML = `
		<label for="currentPassword">Current password</label>
		<input id="currentPassword" type="password" autocomplete="current-password" placeholder="Current password">
		<label for="newPassword">New password</label>
		<input id="newPassword" type="password" autocomplete="new-password" placeholder="New password">
		<label for="confirmPassword">Confirm new password</label>
		<input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Confirm new password">
		<div class="popup-actions">
			<button type="button" class="secondary-action">Cancel</button>
			<button type="submit">Update password</button>
		</div>
	`;

	const { closePopup } = createPopupShell("Change Password", form);
	const cancelButton = form.querySelector(".secondary-action");
	const currentPassword = form.querySelector("#currentPassword");
	const newPassword = form.querySelector("#newPassword");
	const confirmPassword = form.querySelector("#confirmPassword");

	cancelButton.addEventListener("click", closePopup);
	currentPassword.focus();

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (!newPassword.value.trim() || !confirmPassword.value.trim()) {
			alert("Enter and confirm a new password.");
			return;
		}

		if (newPassword.value !== confirmPassword.value) {
			alert("Passwords do not match.");
			return;
		}

		alert("Password change flow is ready for backend wiring.");
		closePopup();
	});
}

function openDeleteAccountPopup() {
	const content = document.createElement("div");
	content.className = "popup-stack";
	content.innerHTML = `
		<p class="popup-warning">This will permanently delete your account and remove your profile data.</p>
		<label for="deleteConfirm">Type DELETE to continue</label>
		<input id="deleteConfirm" type="text" placeholder="DELETE">
		<div class="popup-actions">
			<button type="button" class="secondary-action">Cancel</button>
			<button type="button" class="danger-action">Delete account</button>
		</div>
	`;

	const { closePopup } = createPopupShell("Delete Account", content);
	const cancelButton = content.querySelector(".secondary-action");
	const deleteButton = content.querySelector(".danger-action");
	const deleteConfirm = content.querySelector("#deleteConfirm");

	cancelButton.addEventListener("click", closePopup);
	deleteButton.addEventListener("click", () => {
		if (deleteConfirm.value.trim().toUpperCase() !== "DELETE") {
			alert("Type DELETE exactly to confirm.");
			return;
		}

		alert("Delete account flow is ready for backend wiring.");
		closePopup();
	});
	deleteConfirm.focus();
}

async function changeLanguage(params) {
    const { error, data } = await supabase
        .from("profiles")
        .update({ Language: params.Language })
        .eq("id", params.userId);

    if (error) {
        console.error("Error updating language:", error.message);
        alert("Failed to update language. Please try again.");
        return;
    }

    alert(`Language updated to ${params.Language}.`);
}

document.getElementById("changeLangButton")?.addEventListener("click", async () => {
    const selectedLanguage = document.getElementById("LangDropdown").value;
    
    // 1. Fixed: Added await and destructured the user object correctly
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Check if the user object actually exists
    if (!user) {
        alert("No user is currently logged in.");
        return;
    }

    // 3. Pass user.id instead of currentUser.id
    await changeLanguage({ userId: user.id, Language: selectedLanguage });
});



themeSelect?.addEventListener("change", (event) => {
	applyTheme(event.target.value);
});

changePasswordButton?.addEventListener("click", openChangePasswordPopup);
deleteAccountButton?.addEventListener("click", openDeleteAccountPopup);

