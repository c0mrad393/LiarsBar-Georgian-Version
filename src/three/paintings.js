// Niko Pirosmani's paintings (1862–1918, public domain; images from WikiArt,
// resized to 512px WebP in public/pirosmani/). Each room hangs its own few.
// Textures load in the background and are shared across rooms; until one
// arrives its frame shows the dark oilcloth Pirosmani painted on.
import * as THREE from "three";

/** name → [width / height, Georgian title] */
export const PIROSMANI = {
  "five-princes": [750 / 396, "ხუთი თავადის ქეიფი"],
  margarita: [485 / 600, "მსახიობი მარგარიტა"],
  fisherman: [491 / 600, "მეთევზე წითელ პერანგში"],
  giraffe: [483 / 600, "ჟირაფი"],
  "still-life": [750 / 357, "ნატურმორტი"],
  "cold-beer": [323 / 600, "ცივი ლუდი"],
  qvevri: [750 / 380, "ორი ქართველი ქვევრთან"],
  vintage: [750 / 481, "რთველი"],
  sarkis: [675 / 600, "სარქისი ღვინოს ასხამს"],
  barrel: [696 / 600, "მუშები კასრით"],
  "horn-man": [372 / 600, "ყანწიანი კაცი"],
  gazebo: [485 / 600, "ქეიფი ვაზის ტალავერში"],
  "night-feast": [750 / 508, "ფაეტონი და ღამის ქეიფი"],
  ortachala: [265 / 600, "ორთაჭალის ლამაზმანი"],
  kinto: [285 / 600, "პატარა კინტო"],
  tambourine: [492 / 600, "ქართველი ქალი დაირით"],
  funicular: [637 / 600, "თბილისის ფუნიკულიორი"],
  "bear-moon": [479 / 600, "დათვი მთვარიან ღამეში"],
  "black-bear": [750 / 545, "შავი დათვი"],
  deer: [485 / 600, "ირემი"],
  hunter: [750 / 555, "მონადირე"],
  shepherd: [290 / 600, "მწყემსი"],
  "roe-deer": [750 / 563, "შველი წყაროსთან"],
};

const cache = new Map();
/** The painting as a texture (the same one every time; it fills in when loaded). */
export function paintingTex(name) {
  if (cache.has(name)) return cache.get(name);
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.keep = true; // shared by every room: rooms never dispose it
  const img = new Image();
  img.decoding = "async";
  img.onload = () => { tex.image = img; tex.needsUpdate = true; };
  img.src = `${import.meta.env.BASE_URL}pirosmani/${name}.webp`;
  cache.set(name, tex);
  return tex;
}
