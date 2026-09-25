import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(<App />);

if (import.meta.env.PROD) {
  // A new deploy removes the old hashed files: if a lazy screen fails to load, take the new version.
  window.addEventListener("vite:preloadError", () => window.location.reload());
  // Instant repeat visits and offline solo play (see src/sw-template.js).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
}
