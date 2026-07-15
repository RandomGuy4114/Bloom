// Dependencies

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Definitions

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "mobile");
const assetDirectories = ["Assets", "css", "js", "pages"];
const mobileRoutePattern = /((?:\.\.?\/)+(?:[a-zA-Z0-9_-]+\/)*)?(?=["'`])/g;
const mobileStyles = `

/* Mobile App Navigation */

.BloomConnectButton {
  margin-left: auto;
  padding: 10px 14px;
  border: 0;
  border-radius: 500px;
  background-color: transparent;
  color: #9CB080;
  font-size: 20px;
}

.BloomConnectButton:hover {
  background-color: transparent;
  color: #ffffff;
}

.TopSection {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px;
}

.TopSection h1 {
  margin: 0;
  color: #9CB080;
  text-align: center;
}

.BloomConnectPill {
  display: flex;
  align-items: center;
  margin-left: auto;
  border-radius: 500px;
  background-color: rgba(156, 176, 128, 0.33);
}

.BloomConnectStatusCircle {
  width: 20px;
  height: 20px;
  margin-left: 8px;
  border-radius: 50%;
  background-color: #c13f3f;
}

.BloomConnectStatusCircle.connected {
  background-color: #ff9800;
}

.BloomConnectStatusCircle.newUserDetected {
  background-color: #9CB080;
}

@media (max-width: 768px) {
  :root {
    --mobile-nav-height: 72px;
    --mobile-safe-top: env(safe-area-inset-top, 0px);
    --mobile-safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  body:has(.topbar) {
    box-sizing: border-box;
    min-height: 100dvh;
    padding-top: var(--mobile-safe-top);
    padding-bottom: calc(var(--mobile-nav-height) + var(--mobile-safe-bottom));
  }

  .topbar {
    top: auto !important;
    bottom: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
    height: calc(var(--mobile-nav-height) + var(--mobile-safe-bottom));
    min-height: calc(var(--mobile-nav-height) + var(--mobile-safe-bottom));
    max-height: calc(var(--mobile-nav-height) + var(--mobile-safe-bottom));
    padding: 6px 8px calc(6px + var(--mobile-safe-bottom));
    gap: 0;
    overflow: hidden;
  }

  .topbar-logo,
  .topbar nav #username-label {
    display: none !important;
  }

  .topbar nav {
    display: none !important;
  }

  .topbar .mobile-profile-avatar {
    width: 38px;
    height: 38px;
    align-self: center;
    justify-self: center;
    margin: 0 auto;
    border: 2px solid transparent;
    cursor: pointer;
  }

  .topbar .mobile-profile-avatar[aria-current="page"] {
    border-color: currentColor;
  }

  .home-page .main-layout,
  .app-page .main-layout,
  .profile-page .main-layout,
  .community-page .main-layout,
  .main-layout {
    margin-top: 0 !important;
  }

  .map-page .main-layout,
  .map-container,
  #map {
    max-height: calc(100dvh - var(--mobile-safe-top) - var(--mobile-nav-height) - var(--mobile-safe-bottom));
  }

  .create-post-page .main-layout {
    min-height: calc(100dvh - var(--mobile-safe-top) - var(--mobile-nav-height) - var(--mobile-safe-bottom));
    align-items: stretch;
  }

  .create-post-page .post-editor {
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
  }

  .topbar-actions {
    display: block;
    min-width: 0;
    width: 100%;
    height: 100%;
  }

  .topbar-action-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px;
    height: 100%;
  }

  .topbar-action-row button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 48px;
    padding: 3px 1px;
    border: 0;
    background: transparent;
    color: inherit;
    line-height: 1;
  }

  .topbar-action-row button i {
    font-size: 1.55rem;
  }

  .topbar-action-row button span {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .topbar-action-row button[aria-current="page"] {
    color: #2b5748;
    font-weight: 700;
  }

  body[data-theme="dark"] .topbar-action-row button[aria-current="page"] {
    color: #a9c9ad;
  }
}
`;
const mobileNavigationScript = `

// Mobile App Navigation

const mobileNavigationItems = [
  { key: "home", label: "Home", icon: "ri-home-line", activeIcon: "ri-home-fill" },
  { key: "communities", label: "Communities", icon: "ri-group-line", activeIcon: "ri-group-fill" },
  { key: "createPost", label: "Create", icon: "ri-add-circle-line", activeIcon: "ri-add-circle-fill" },
  { key: "settings", label: "Settings", icon: "ri-settings-3-line", activeIcon: "ri-settings-3-fill" },
];

function getMobileNavigationPage() {
  const path = window.location.pathname;
  if (path.includes("/pages/communities/")) return "communities";
  if (path.includes("/pages/app/profile/")) return "profile";
  if (path.includes("/pages/app/create-post/")) return "createPost";
  return mobileNavigationItems.find(({ key }) => path.includes(\`/pages/app/\${key}/\`))?.key ?? "";
}

function initializeMobileAppNavigation() {
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const topbar = document.querySelector(".topbar");
  const actions = topbar?.querySelector(".topbar-actions");
  const avatar = topbar?.querySelector("nav .pfp-frame");
  if (!topbar || !actions) return;

  const activePage = getMobileNavigationPage();
  const row = document.createElement("div");
  row.className = "topbar-action-row";

  mobileNavigationItems.forEach(({ key, label, icon, activeIcon }, index) => {
    const selected = key === activePage;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mobileRoute = key;
    button.setAttribute("aria-label", label);
    if (selected) button.setAttribute("aria-current", "page");
    const iconElement = document.createElement("i");
    iconElement.className = selected ? activeIcon : icon;
    iconElement.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = label;
    button.append(iconElement, text);
    button.addEventListener("click", () => {
      window.location.href = PAGE_URLS[key];
    });
    row.appendChild(button);
    if (index === 1 && avatar) {
      avatar.classList.add("mobile-profile-avatar");
      row.appendChild(avatar);
    }
  });

  actions.replaceChildren(row);

  if (avatar) {
    avatar.dataset.accountMenuReady = "true";
    avatar.tabIndex = 0;
    avatar.setAttribute("role", "link");
    avatar.setAttribute("aria-label", "Open profile");
    if (activePage === "profile") avatar.setAttribute("aria-current", "page");
    avatar.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = PAGE_URLS.profile;
    }, true);
    avatar.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.location.href = PAGE_URLS.profile;
    });
  }
}

initializeMobileAppNavigation();
`;

// Functions

function addMobileEntryFile(source) {
  return source.replace(mobileRoutePattern, (route) =>
    route ? `${route}index.html` : route
  );
}

function ensureMobileIconFont(source) {
  if (!source.includes('class="topbar"') || source.includes("remixicon")) return source;
  return source.replace(
    "</head>",
    '    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.9.0/fonts/remixicon.css" rel="stylesheet">\n</head>',
  );
}

function ensureMobileViewport(source) {
  return source.replace(
    /<meta\s+name=["']viewport["']\s+content=["']([^"']*)["']\s*\/?\s*>/i,
    (_match, content) => {
      const values = content
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value && !value.startsWith("viewport-fit="));
      values.push("viewport-fit=cover");
      return `<meta name="viewport" content="${values.join(", ")}">`;
    },
  );
}

async function normalizeMobileRoutes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizeMobileRoutes(path);
      return;
    }
    if (!/\.(?:html|js)$/.test(entry.name)) return;
    const source = await readFile(path, "utf8");
    await writeFile(
      path,
      addMobileEntryFile(ensureMobileIconFont(ensureMobileViewport(source))),
      "utf8",
    );
  }));
}

// Build

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all(assetDirectories.map((directory) =>
  cp(resolve(projectRoot, directory), resolve(outputDirectory, directory), { recursive: true })
));

const mobileHomeSource = await readFile(resolve(projectRoot, "mobile-src/home.html"), "utf8");
await writeFile(resolve(outputDirectory, "pages/app/home/index.html"), mobileHomeSource, "utf8");

const mobileStylesPath = resolve(outputDirectory, "css/styles.css");
const sharedStyles = await readFile(mobileStylesPath, "utf8");
await writeFile(mobileStylesPath, `${sharedStyles}${mobileStyles}`, "utf8");
const mobileMainPath = resolve(outputDirectory, "js/main.js");
const sharedMain = await readFile(mobileMainPath, "utf8");
const mobileMain = sharedMain.replace(
  "function initializeGlobalSearch() {",
  'function initializeGlobalSearch() {\n  if (window.matchMedia("(max-width: 768px)").matches) return;',
);
await writeFile(mobileMainPath, `${mobileMain}${mobileNavigationScript}`, "utf8");

const landingSource = await readFile(resolve(projectRoot, "pages/landing/index.html"), "utf8");
const mobileIndex = landingSource
  .replaceAll("../../Assets/", "./Assets/")
  .replaceAll("../../css/", "./css/")
  .replaceAll("../../js/", "./js/")
  .replaceAll("../auth/", "./pages/auth/")
  .replaceAll("../legal/", "./pages/legal/")
  .replaceAll("../credits/", "./pages/credits/");
await writeFile(resolve(outputDirectory, "index.html"), mobileIndex, "utf8");
await normalizeMobileRoutes(outputDirectory);

console.log(`Capacitor web assets prepared in ${outputDirectory}`);
