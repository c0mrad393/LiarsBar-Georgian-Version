// Inlines LiarsDeckPro.jsx into index.html so the page runs without a server
// (double-click / file://) and on GitHub Pages. No dependencies: `node build.mjs`.
import { readFileSync, writeFileSync } from "node:fs";

const BEGIN = "// BEGIN LiarsDeckPro.jsx";
const END = "// END LiarsDeckPro.jsx";

const src = readFileSync(new URL("./LiarsDeckPro.jsx", import.meta.url), "utf8")
  .replace(/^\s*import[^\n]*\n/gm, "")
  .replace(/export\s+default\s+function/, "function");

if (src.includes("</script")) throw new Error("LiarsDeckPro.jsx contains </script>, which would break the inline <script>");

const htmlUrl = new URL("./index.html", import.meta.url);
const html = readFileSync(htmlUrl, "utf8");
const a = html.indexOf(BEGIN), b = html.indexOf(END);
if (a < 0 || b < a) throw new Error(`index.html is missing the ${BEGIN} / ${END} markers`);

writeFileSync(htmlUrl, html.slice(0, a + BEGIN.length) + "\n" + src.trimEnd() + "\n" + html.slice(b));
console.log("index.html updated from LiarsDeckPro.jsx");
