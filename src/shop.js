// The shop catalog, shared by the browser and the server (the server checks
// prices and ownership against it). Everything is cosmetic.
//
// Item: { id, cat, name, price, r: rarity, e: emoji | svg: custom drawing, ...placement tweaks }
// price 0 = free for everyone, no purchase needed.

export const CATS = [
  { id: "head", slot: "avatar", name: "პერსონაჟები", icon: "🥟" },
  { id: "hat", slot: "hat", name: "ქუდები", icon: "🎩" },
  { id: "eyes", slot: "eyes", name: "სათვალეები", icon: "🕶️" },
  { id: "mouth", slot: "mouth", name: "ულვაში", icon: "👨" },
  { id: "neck", slot: "neck", name: "კისერი", icon: "🎀" },
  { id: "hand", slot: "hand", name: "ხელში", icon: "🍺" },
  { id: "outfit", slot: "outfit", name: "ტანსაცმელი", icon: "👔" },
  { id: "throw", slot: null, name: "სასროლი", icon: "🍅" },
  { id: "cards", slot: "cards", name: "კარტის ზურგი", icon: "🂠" },
  { id: "felt", slot: "felt", name: "მაგიდა", icon: "🟩" },
];
export const WEAR_SLOTS = ["hat", "eyes", "mouth", "neck", "hand", "outfit", "cards", "felt"];

export const RARITY = {
  free: { name: "უფასო", color: "#2ec4b6" },
  rare: { name: "იშვიათი", color: "#3a86ff" },
  epic: { name: "ეპიკური", color: "#9b5de5" },
  legend: { name: "ლეგენდარული", color: "#ff9f1c" },
};
const rarity = (price) => (price === 0 ? "free" : price < 150 ? "rare" : price < 300 ? "epic" : "legend");

// [id, name, price, render]
const RAW = {
  head: [
    // Hand-drawn SVG characters (src/ui/heads.jsx). Their faces all share the
    // same geometry, so every accessory fits every head.
    ["av_khinkali", "ხინკალა", 0], ["av_pig", "გოჭა", 0], ["av_fox", "მელია", 0], ["av_bear", "დათუნა", 0], ["av_tur", "ჯიხვი", 0],
  ],
  // A small set, each fitted by hand to every character (2D and 3D).
  hat: [
    ["hat_cap", "კეპი", 0, { e: "🧢" }], ["hat_party", "დაბადების დღე", 0, { svg: "party" }],
    ["hat_top", "ცილინდრი", 100, { e: "🎩" }], ["hat_papakha", "ფაფახი", 150, { svg: "papakha" }],
    ["hat_chef", "მზარეულის ქუდი", 150, { svg: "chef" }], ["hat_viking", "ვიკინგი", 250, { svg: "viking" }],
    ["hat_halo", "შარავანდედი", 260, { svg: "halo" }], ["hat_crown", "გვირგვინი", 500, { e: "👑", anim: "shine" }],
  ],
  eyes: [
    ["eye_glasses", "სათვალე", 0, { e: "👓" }], ["eye_sun", "მზის სათვალე", 0, { e: "🕶️" }],
    ["eye_heart", "გულის სათვალე", 150, { svg: "heartglasses" }], ["eye_monocle", "მონოკლი", 180, { svg: "monocle" }],
  ],
  mouth: [
    ["m_stache", "ულვაში", 0, { svg: "stache" }], ["m_curly", "ხვეული ულვაში", 100, { svg: "curly" }],
    ["m_beard", "დიდი წვერი", 170, { svg: "beard" }],
  ],
  neck: [
    ["n_redbow", "წითელი პეპელა", 0, { svg: "bowtie", color: "#e23d43" }], ["n_scarf", "შარფი", 120, { svg: "scarf" }],
    ["n_medal", "მედალი", 150, { svg: "medal" }], ["n_chain", "ოქროს ჯაჭვი", 280, { svg: "chain" }],
  ],
  hand: [
    ["h_beer", "ლუდი", 0, { e: "🍺" }], ["h_wine", "ღვინის ჭიქა", 150, { e: "🍷" }],
  ],
  outfit: [
    ["o_tshirt", "მაისური", 0, { svg: "tshirt" }], ["o_sweater", "სვიტერი", 0, { svg: "sweater" }],
    ["o_track", "სპორტული", 120, { svg: "track" }], ["o_leather", "ტყავის ქურთუკი", 180, { svg: "leather" }],
    ["o_hoodie", "ჰუდი", 120, { svg: "hoodie" }], ["o_tux", "სმოკინგი", 200, { svg: "tux" }],
    ["o_chokha", "ჩოხა", 400, { svg: "chokha" }], ["o_gold", "ოქროს კოსტიუმი", 500, { svg: "goldsuit" }],
  ],
  throw: [
    ["🍅", "პომიდორი", 0], ["🥚", "კვერცხი", 0], ["💐", "ყვავილები", 0],
    ["🧻", "ტუალეტის ქაღალდი", 100], ["💦", "წყლის ბუშტი", 110], ["🧦", "სუნიანი წინდა", 120], ["🌶️", "წიწაკა", 130],
    ["🥧", "ტორტი სახეში", 150], ["🐟", "თევზი", 150], ["💩", "💩 ბომბი", 250],
  ],
  cards: [
    ["c_red", "კლასიკური წითელი", 0, { back: "red" }], ["c_blue", "კლასიკური ლურჯი", 0, { back: "blue" }],
    ["c_money", "დოლარები", 150, { back: "money" }], ["c_rainbow", "ცისარტყელა", 180, { back: "rainbow" }],
    ["c_leopard", "ლეოპარდი", 180, { back: "leopard" }], ["c_georgia", "ხუთჯვრიანი", 200, { back: "georgia" }],
    ["c_gold", "შავი და ოქრო", 250, { back: "gold" }], ["c_galaxy", "გალაქტიკა", 300, { back: "galaxy" }],
  ],
  felt: [
    ["f_green", "კლასიკური მწვანე", 0, { felt: ["#3f8a55", "#2c6a40", "#1a4429"] }],
    ["f_blue", "სამეფო ლურჯი", 120, { felt: ["#5aa2ff", "#2f6fd6", "#1d4a9c"] }],
    ["f_red", "კაზინოს წითელი", 120, { felt: ["#ff6b6b", "#d33a3a", "#8f1f1f"] }],
    ["f_purple", "იასამნისფერი", 120, { felt: ["#b98cff", "#7b4fd6", "#4d2a96"] }],
    ["f_pink", "ვარდისფერი", 150, { felt: ["#ff9ed2", "#ec5fa8", "#a8326f"] }],
    ["f_night", "შუაღამე", 150, { felt: ["#4a5a7a", "#27324a", "#131a2b"] }],
    ["f_gold", "ოქროს", 300, { felt: ["#ffe08a", "#e0a82e", "#9c6a12"] }],
  ],
};

/** Per-head gear offsets (x/y shift of the face centre, s = scale). All current heads use the standard face. */
export const FACE_FIT = {};

/** How each head is drawn: species and its three fur tones (lit, base, shadow). */
export const HEAD_INFO = {
  av_khinkali: { kind: "khinkali", colors: { light: "#fffaf0", fur: "#f4e2bd", dark: "#cfae74" } },
  av_pig: { kind: "pig", colors: { light: "#ffe6ee", fur: "#ffb3c7", dark: "#e37d9b" } },
  av_fox: { kind: "fox", colors: { light: "#ffd29e", fur: "#ff9a3c", dark: "#d0601a" } },
  av_bear: { kind: "bear", colors: { light: "#d9a474", fur: "#a86b3c", dark: "#6c3f1f" } },
  av_tur: { kind: "tur", colors: { light: "#dcb98c", fur: "#b08457", dark: "#7a5330" } },
};

// Emoji heads from before the drawn characters: the closest match, otherwise a stable pick.
const LEGACY_HEAD = {
  "🐷": "av_pig", "🐽": "av_pig", "🦊": "av_fox", "🐻": "av_bear", "🐼": "av_bear", "🐨": "av_bear",
  "🐂": "av_tur", "🐮": "av_tur", "🐐": "av_tur", "🦌": "av_tur", "🥟": "av_khinkali", "🙂": "av_khinkali",
};

export const ITEMS = {};
export const BY_CAT = {};
for (const [cat, list] of Object.entries(RAW)) {
  BY_CAT[cat] = list.map(([id, name, price, render = {}]) => {
    const item = { id, cat, name, price, r: rarity(price), ...(cat === "head" || cat === "throw" ? { e: id } : render) };
    ITEMS[id] = item;
    return item;
  });
}

export const FREE_AVATARS = BY_CAT.head.filter((i) => i.price === 0).map((i) => i.id);
/** Any stored or sent head → one we can draw (old emoji heads map to a character). */
export function headOf(a) {
  if (HEAD_INFO[a]) return a;
  if (LEGACY_HEAD[a]) return LEGACY_HEAD[a];
  let h = 0;
  for (const ch of String(a || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return FREE_AVATARS[h % FREE_AVATARS.length];
}
export const ALL_AVATARS = BY_CAT.head.map((i) => i.id);
export const FREE_THROWS = BY_CAT.throw.filter((i) => i.price === 0).map((i) => i.id);
export const ALL_THROWS = BY_CAT.throw.map((i) => i.id);

export const isFree = (id) => ITEMS[id]?.price === 0;
export const owns = (owned, id) => isFree(id) || (owned || []).includes(id);
export const slotOf = (id) => CATS.find((c) => c.id === ITEMS[id]?.cat)?.slot || null;

/** Keep only equipped items that exist, sit in the right slot and are owned. */
export function cleanLooks(looks, owned) {
  const out = {};
  if (!looks || typeof looks !== "object") return out;
  for (const slot of WEAR_SLOTS) {
    const id = looks[slot];
    if (typeof id === "string" && ITEMS[id] && slotOf(id) === slot && owns(owned, id)) out[slot] = id;
  }
  return out;
}
