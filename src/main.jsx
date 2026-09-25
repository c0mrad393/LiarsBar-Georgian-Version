import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// The stylesheet loads without blocking the splash (see vite.config.js);
// keep the splash until it's in so the app never flashes unstyled.
function cssReady() {
  const link = document.querySelector("link[data-app-css]");
  if (!link || link.rel === "stylesheet" && link.sheet) return Promise.resolve();
  return new Promise((ok) => {
    link.addEventListener("load", ok, { once: true });
    link.addEventListener("error", ok, { once: true });
    setTimeout(ok, 4000);
  });
}

cssReady().then(() => createRoot(document.getElementById("root")).render(<App />));

if (import.meta.env.PROD) {
  // A new deploy removes the old hashed files: if a lazy screen fails to load, take the new version.
  window.addEventListener("vite:preloadError", () => window.location.reload());
  // Instant repeat visits and offline solo play (see src/sw-template.js).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
}
