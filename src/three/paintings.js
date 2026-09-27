// Four canvases in Niko Pirosmani's naive style, painted in code on one 2×2
// atlas: black oilcloth ground, flat figures lit warm, a white title below.
import { canvasTex, rng } from "./kit.js";

export function paintingsAtlas() {
  return canvasTex(1024, 768, (g) => {
    const r = rng(11);
    const panel = (px, py, draw, title) => {
      g.save();
      g.translate(px, py);
      g.fillStyle = "#15100c";
      g.fillRect(0, 0, 512, 384);
      // oilcloth weave
      for (let i = 0; i < 380; i++) {
        g.fillStyle = `rgba(255,255,255,${r() * 0.035})`;
        g.fillRect(r() * 512, r() * 384, 1 + r() * 3, 1);
      }
      draw(g);
      g.fillStyle = "#f3ead2";
      g.font = "900 26px 'Noto Serif Georgian', Georgia, serif";
      g.textAlign = "center";
      g.fillText(title, 256, 368);
      g.restore();
    };
    const blob = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };

    // 1. the feast
    panel(0, 0, () => {
      g.fillStyle = "#1f3a22";
      g.fillRect(0, 300, 512, 40);
      [[110, "#2a2018"], [190, "#3b2a1d"], [270, "#2a2018"], [350, "#3b2a1d"], [420, "#2a2018"]].forEach(([x, c], i) => {
        g.fillStyle = c;
        g.fillRect(x - 28, 150, 56, 110);
        blob(x, 130, 22, 26, "#e8c49a");
        g.fillStyle = "#1a120c";
        g.fillRect(x - 20, 96, 40, 18); // papakha
        g.fillStyle = "#1a120c";
        g.fillRect(x - 14, 138, 28, 5); // moustache
        if (i === 2) { g.strokeStyle = "#e0a94a"; g.lineWidth = 8; g.beginPath(); g.moveTo(x + 22, 170); g.quadraticCurveTo(x + 52, 150, x + 46, 110); g.stroke(); } // tamada's horn
      });
      g.fillStyle = "#f3ead2";
      g.fillRect(40, 240, 432, 60); // white tablecloth
      [[90, "#8f2420"], [300, "#8f2420"]].forEach(([x, c]) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, 250); g.lineTo(x + 30, 250); g.lineTo(x + 36, 214); g.lineTo(x - 6, 214); g.fill(); });
      blob(200, 236, 34, 12, "#d9a032");
      blob(390, 236, 26, 10, "#3f6b3a");
    }, "ქეიფი");

    // 2. the deer
    panel(512, 0, () => {
      g.fillStyle = "#23402a";
      g.beginPath(); g.moveTo(0, 330); g.quadraticCurveTo(256, 250, 512, 330); g.lineTo(512, 340); g.lineTo(0, 340); g.fill();
      blob(420, 70, 30, 30, "#f3ead2");
      g.fillStyle = "#e0a94a";
      blob(250, 230, 90, 42, "#c98d4a");
      g.fillStyle = "#c98d4a";
      g.fillRect(310, 150, 26, 80);
      blob(330, 140, 30, 22, "#c98d4a");
      [[190, 260], [215, 262], [285, 262], [305, 260]].forEach(([x, y]) => g.fillRect(x, y, 12, 64));
      g.strokeStyle = "#f3ead2"; g.lineWidth = 6;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(330 + s * 8, 122); g.lineTo(330 + s * 30, 80); g.lineTo(330 + s * 22, 60); g.moveTo(330 + s * 22, 96); g.lineTo(330 + s * 44, 90); g.stroke(); }
      for (let i = 0; i < 40; i++) blob(r() * 512, 300 + r() * 30, 3, 3, r() < 0.5 ? "#f3ead2" : "#b3302a");
    }, "ირემი");

    // 3. Margarita
    panel(0, 384, () => {
      g.fillStyle = "#f3ead2";
      g.beginPath(); g.moveTo(256, 130); g.lineTo(180, 320); g.lineTo(332, 320); g.fill();
      blob(256, 100, 30, 36, "#f2cfa6");
      blob(256, 70, 36, 20, "#2a1a10");
      g.strokeStyle = "#f2cfa6"; g.lineWidth = 12;
      g.beginPath(); g.moveTo(236, 160); g.lineTo(170, 120); g.moveTo(276, 160); g.lineTo(342, 120); g.stroke();
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d = 90 + r() * 140;
        blob(256 + Math.cos(a) * d, 190 + Math.sin(a) * d * 0.7, 5 + r() * 5, 5 + r() * 5, r() < 0.6 ? "#b3302a" : "#f3ead2");
      }
      blob(246, 100, 3, 3, "#1a120c"); blob(266, 100, 3, 3, "#1a120c");
      blob(256, 118, 8, 3, "#b3302a");
    }, "მსახიობი მარგარიტა");

    // 4. still life: wine, bread and fish
    panel(512, 384, () => {
      g.fillStyle = "#f3ead2";
      g.fillRect(40, 250, 432, 70);
      g.fillStyle = "#8f2420";
      g.beginPath(); g.moveTo(120, 250); g.quadraticCurveTo(60, 190, 110, 120); g.lineTo(150, 120); g.quadraticCurveTo(200, 190, 140, 250); g.fill();
      g.fillStyle = "#8f2420"; g.fillRect(118, 96, 24, 26);
      blob(280, 238, 80, 26, "#d9a032");
      g.strokeStyle = "#8a5a14"; g.lineWidth = 4;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(230 + i * 30, 222); g.lineTo(242 + i * 30, 250); g.stroke(); }
      blob(410, 232, 52, 16, "#9aa3b2");
      g.fillStyle = "#9aa3b2"; g.beginPath(); g.moveTo(452, 232); g.lineTo(478, 214); g.lineTo(478, 250); g.fill();
      for (let i = 0; i < 12; i++) blob(200 + (i % 4) * 14, 180 + Math.floor(i / 4) * 14, 8, 8, "#5b2a6e");
    }, "ღვინო, პური და თევზი");
  });
}

