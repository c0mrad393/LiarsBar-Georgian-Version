import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained index.html: works on GitHub Pages and when opened from disk.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  // server/.wrangler holds the local room server's database; don't reload the page on its writes.
  server: { port: 5178, watch: { ignored: ["**/.wrangler/**", "**/server/**"] } },
});
