import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Bloom could not find its application root.");
}

function showStartupError(error: unknown) {
  console.error("Bloom failed to start:", error);
  rootElement!.innerHTML = `
    <main class="root-startup" role="alert">
      Bloom could not start. Refresh the page to try again.
    </main>
  `;
}

try {
  const app = (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  if (rootElement.dataset.prerendered === "true") {
    hydrateRoot(rootElement, app, { onUncaughtError: showStartupError });
  } else {
    createRoot(rootElement, { onUncaughtError: showStartupError }).render(app);
  }
} catch (error) {
  showStartupError(error);
}
