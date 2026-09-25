import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

/**
 * Writes dist/sw.js with this build's file list baked in, so the service
 * worker can precache exactly the current version (see src/sw-template.js).
 */
function serviceWorker() {
  return {
    name: "liarsbar-sw",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((f) => f.startsWith("assets/") && !f.endsWith(".map"));
      const files = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", ...built.map((f) => `./${f}`)];
      const version = createHash("sha256").update(files.join("|")).digest("hex").slice(0, 10);
      const source = readFileSync(new URL("./src/sw-template.js", import.meta.url), "utf8")
        .replace("__VERSION__", version)
        .replace("__FILES__", JSON.stringify(files));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), serviceWorker()],
  build: { target: "es2020", cssCodeSplit: true },
  // server/.wrangler holds the local room server's database; don't reload the page on its writes.
  server: { port: 5178, watch: { ignored: ["**/.wrangler/**", "**/server/**"] } },
});
