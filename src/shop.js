// The shop catalog, shared by the browser and the server (the server checks
// prices and ownership against it). Everything is cosmetic.
//
// Item: { id, cat, name, price, r: rarity, e: emoji | svg: custom drawing, ...placement tweaks }
// price 0 = free for everyone, no purchase needed.

export const CATS = [
  { id: "head", slot: "avatar", name: "ავატარები", icon: "😺" },
  { id: "hat", slot: "hat", name: "ქუდები", icon: "🎩" },
  { id: "eyes", slot: "eyes", name: "სათვალეები", icon: "🕶️" },
  { id: "mouth", slot: "mouth", name: "სახე", icon: "👄" },
  { id: "neck", slot: "neck", name: "კისერი", icon: "🎀" },
  { id: "hand", slot: "hand", name: "ხელში", icon: "🍺" },
  { id: "pet", slot: "pet", name: "შინაური", icon: "🦜" },
  { id: "aura", slot: "aura", name: "აურა", icon: "✨" },
  { id: "outfit", slot: "outfit", name: "ტანსაცმელი", icon: "👔" },
  { id: "wings", slot: "wings", name: "ფრთები", icon: "🪽" },
  { id: "throw", slot: null, name: "სასროლი", icon: "🍅" },
  { id: "cards", slot: "cards", name: "კარტის ზურგი", icon: "🂠" },
  { id: "felt", slot: "felt", name: "მაგიდა", icon: "🟩" },
];
export const WEAR_SLOTS = ["hat", "eyes", "mouth", "neck", "hand", "pet", "aura", "outfit", "wings", "cards", "felt"];

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
    // free heads (also the avatar picker on the home screen); smileys first: every accessory fits them
    ["🙂", "ღიმილა", 0], ["😀", "მხიარული", 0], ["😁", "კბილებიანი", 0], ["😜", "ენიანი", 0], ["🤪", "გიჟი", 0],
    ["😏", "ეშმაკური", 0], ["😇", "ანგელოზი", 0], ["🥳", "ზეიმი", 0], ["😎", "მაგარი", 0], ["🤓", "ნერდი", 0],
    ["🐸", "ბაყაყი", 0], ["🐵", "მაიმუნი", 0], ["🐼", "პანდა", 0], ["🐔", "ქათამი", 0], ["🦁", "ლომი", 0],
    ["🐨", "კოალა", 0], ["🐙", "რვაფეხა", 0], ["🦄", "ერთრქა", 0], ["🐧", "პინგვინი", 0], ["🦖", "დინო", 0],
    ["🐶", "ძაღლი", 0], ["🐹", "ზაზუნა", 0], ["🐰", "კურდღელი", 0], ["🐭", "თაგვი", 0], ["🐯", "ვეფხვი", 0],
    ["🐮", "ძროხა", 0], ["🦉", "ბუ", 0], ["🦆", "იხვი", 0], ["🐢", "კუ", 0], ["🦔", "ზღარბი", 0],
    // premium
    ["🦝", "ენოტი", 60], ["🐌", "ლოკოკინა", 60], ["🦀", "კიბორჩხალა", 80], ["🦥", "ზარმაცა", 80], ["🦩", "ფლამინგო", 90],
    ["🐳", "ვეშაპი", 100], ["🦦", "წავი", 100], ["🦒", "ჟირაფი", 100], ["🎃", "გოგრა", 110], ["🐺", "მგელი", 120],
    ["🦈", "ზვიგენი", 120], ["👽", "უცხოპლანეტელი", 130], ["🤖", "რობოტი", 130], ["🐲", "დრაკონი", 160], ["🤡", "კლოუნი", 160],
    ["🧟", "ზომბი", 170], ["🧛", "ვამპირი", 170], ["🥔", "კარტოფილი", 180], ["🧀", "სულგუნი", 200], ["🍷", "ღვინო", 200],
    ["🤠", "კოვბოი", 220], ["🥸", "შენიღბული", 240], ["🎅", "თოვლის ბაბუა", 250], ["🦨", "სკუნსი", 260], ["🥷", "ნინძა", 280],
    ["🧙", "ჯადოქარი", 300], ["🦸", "სუპერგმირი", 320], ["👹", "დევი", 350], ["🥟", "ხინკალი", 400], ["🦹", "ბოროტმოქმედი", 450],
  ],
  hat: [
    ["hat_cap", "კეპი", 0, { e: "🧢" }], ["hat_sun", "პანამა", 0, { e: "👒" }], ["hat_bow", "ბაფთა", 0, { e: "🎀", s: 0.5 }],
    ["hat_grad", "დიპლომი", 0, { e: "🎓" }], ["hat_party", "დაბადების დღე", 0, { svg: "party" }],
    ["hat_bucket", "ვედრო", 70, { e: "🪣", rot: 175, dy: -0.34 }], ["hat_banana", "ბანანი", 80, { e: "🍌", rot: -30 }],
    ["hat_top", "ცილინდრი", 100, { e: "🎩" }], ["hat_egg", "ერბოკვერცხი", 100, { e: "🍳", rot: 0, dy: -0.3 }],
    ["hat_helmet", "ჩაფხუტი", 110, { e: "🪖" }], ["hat_cupcake", "ქაფქეიქი", 120, { e: "🧁" }],
    ["hat_plant", "ქოთნის ყვავილი", 130, { e: "🪴", dy: -0.62 }], ["hat_pizza", "პიცა", 140, { e: "🍕", rot: 160, dy: -0.36 }],
    ["hat_pineapple", "ანანასი", 140, { e: "🍍", dy: -0.6 }], ["hat_chef", "მზარეულის ქუდი", 150, { svg: "chef" }],
    ["hat_cake", "ტორტი", 150, { e: "🎂" }], ["hat_duck", "იხვი თავზე", 160, { e: "🦆", anim: "bobble", dy: -0.55 }],
    ["hat_melon", "საზამთროს ჩაფხუტი", 160, { e: "🍉", rot: 180, dy: -0.32, s: 0.72 }],
    ["hat_chicken", "ქათამი თავზე", 180, { e: "🐓", anim: "bobble", dy: -0.6 }], ["hat_octo", "რვაფეხა ქუდი", 200, { e: "🐙", dy: -0.45 }],
    ["hat_propeller", "პროპელერი", 200, { svg: "propeller" }], ["hat_cloud", "წვიმის ღრუბელი", 220, { svg: "raincloud" }],
    ["hat_viking", "ვიკინგი", 250, { svg: "viking" }], ["hat_halo", "შარავანდედი", 260, { svg: "halo" }],
    ["hat_fire", "ცეცხლოვანი თმა", 300, { e: "🔥", anim: "flicker", dy: -0.5, s: 0.72 }],
    ["hat_ufo", "UFO", 350, { svg: "ufo" }], ["hat_crown", "გვირგვინი", 500, { e: "👑", anim: "shine" }],
  ],
  eyes: [
    ["eye_glasses", "სათვალე", 0, { e: "👓" }], ["eye_sun", "მზის სათვალე", 0, { e: "🕶️" }],
    ["eye_goggles", "ცურვის სათვალე", 90, { e: "🥽" }], ["eye_mask", "საძილე ნიღაბი", 110, { svg: "sleepmask" }],
    ["eye_googly", "გუგლი თვალები", 120, { svg: "googly" }], ["eye_3d", "3D სათვალე", 130, { svg: "glasses3d" }],
    ["eye_snorkel", "მყვინთავი", 140, { e: "🤿" }], ["eye_heart", "გულის სათვალე", 150, { svg: "heartglasses" }],
    ["eye_patch", "მეკობრის სახვევი", 160, { svg: "eyepatch" }], ["eye_monocle", "მონოკლი", 180, { svg: "monocle" }],
    ["eye_stars", "ვარსკვლავები", 220, { svg: "stareyes" }], ["eye_laser", "ლაზერული თვალები", 400, { svg: "laser" }],
  ],
  mouth: [
    ["m_stache", "ულვაში", 0, { svg: "stache" }], ["m_curly", "ხვეული ულვაში", 100, { svg: "curly" }],
    ["m_tongue", "ენა", 100, { svg: "tongue" }], ["m_lolly", "ლოლიპოპი", 110, { e: "🍭", dx: 0.28, rot: 30 }],
    ["m_nose", "კლოუნის ცხვირი", 120, { svg: "clownnose" }], ["m_fangs", "ვამპირის კბილები", 150, { svg: "fangs" }],
    ["m_rose", "ვარდი კბილებში", 150, { e: "🌹", rot: -70, dx: 0.1 }], ["m_beard", "დიდი წვერი", 170, { svg: "beard" }],
    ["m_gum", "საღეჭი რეზინი", 180, { svg: "gum" }], ["m_gold", "ოქროს ღიმილი", 250, { svg: "goldgrin" }],
  ],
  neck: [
    ["n_redbow", "წითელი პეპელა", 0, { svg: "bowtie", color: "#e23d43" }], ["n_tie", "ჰალსტუხი", 80, { svg: "tie" }],
    ["n_beads", "მძივები", 100, { svg: "beads" }], ["n_bib", "ბავშვის ხალათი", 110, { svg: "bib" }],
    ["n_scarf", "შარფი", 120, { svg: "scarf" }], ["n_lei", "ჰავაის ყვავილები", 120, { svg: "lei" }],
    ["n_medal", "მედალი", 150, { svg: "medal" }], ["n_chain", "ოქროს ჯაჭვი", 280, { svg: "chain" }],
  ],
  hand: [
    ["h_beer", "ლუდი", 0, { e: "🍺" }], ["h_hotdog", "ჰოთდოგი", 80, { e: "🌭" }], ["h_icecream", "ნაყინი", 90, { e: "🍦" }],
    ["h_drumstick", "ქათმის ფეხი", 90, { e: "🍗" }], ["h_phone", "ტელეფონი", 100, { e: "📱" }], ["h_baguette", "ბაგეტი", 110, { e: "🥖" }],
    ["h_teddy", "დათუნია", 120, { e: "🧸" }], ["h_balloon", "ბუშტი", 120, { e: "🎈", anim: "float", dy: -0.9 }],
    ["h_fish", "თევზი", 130, { e: "🐟", anim: "flop" }], ["h_wine", "ღვინის ჭიქა", 150, { e: "🍷" }],
    ["h_wand", "ჯადოსნური ჯოხი", 180, { e: "🪄", anim: "sparkle" }], ["h_guitar", "გიტარა", 220, { e: "🎸", s: 0.5 }],
    ["h_money", "ფულის ტომარა", 300, { e: "💰" }],
  ],
  pet: [
    ["p_chick", "წიწილა", 150, { e: "🐥" }], ["p_mouse", "თაგუნა", 150, { e: "🐁" }], ["p_frog", "ბაყაყუნა", 150, { e: "🐸" }],
    ["p_lizard", "ხვლიკი", 180, { e: "🦎" }], ["p_cat", "შავი კატა", 200, { e: "🐈‍⬛" }], ["p_bee", "ფუტკარი", 200, { e: "🐝", anim: "orbit" }],
    ["p_bat", "ღამურა", 220, { e: "🦇", anim: "orbit" }], ["p_parrot", "თუთიყუში", 250, { e: "🦜" }],
  ],
  aura: [
    ["a_flies", "ბზუილა ბუზები", 150, { svg: "flies" }], ["a_stink", "სუნი", 150, { svg: "stink" }],
    ["a_bubbles", "ბუშტულები", 160, { svg: "bubbles" }], ["a_dizzy", "თავბრუ", 180, { svg: "dizzy" }],
    ["a_notes", "მუსიკა", 180, { svg: "notes" }], ["a_sparkle", "ბრჭყვიალა", 200, { svg: "sparkles" }],
    ["a_hearts", "გულები", 200, { svg: "hearts" }], ["a_fire", "ალი", 300, { svg: "flames" }],
    ["a_money", "ფულის წვიმა", 420, { svg: "moneyrain" }],
  ],
  outfit: [
    ["o_hoodie", "ჰუდი", 120, { svg: "hoodie" }], ["o_pajama", "პიჟამა", 120, { svg: "pajama" }],
    ["o_prison", "ციხის ფორმა", 150, { svg: "prison" }], ["o_chef", "მზარეულის ქურთუკი", 150, { svg: "chefcoat" }],
    ["o_sailor", "მეზღვაური", 160, { svg: "sailor" }], ["o_hawaii", "ჰავაის პერანგი", 180, { svg: "hawaii" }],
    ["o_tux", "სმოკინგი", 200, { svg: "tux" }], ["o_hero", "სუპერგმირის კოსტიუმი", 320, { svg: "hero" }],
    ["o_chokha", "ჩოხა", 400, { svg: "chokha" }], ["o_gold", "ოქროს კოსტიუმი", 500, { svg: "goldsuit" }],
  ],
  wings: [
    ["w_cape", "წითელი მოსასხამი", 200, { svg: "cape" }], ["w_bat", "ღამურას ფრთები", 250, { svg: "batwings" }],
    ["w_angel", "ანგელოზის ფრთები", 300, { svg: "angelwings" }], ["w_devil", "ეშმაკის ფრთები", 300, { svg: "devilwings" }],
    ["w_jet", "რეაქტიული ზურგჩანთა", 380, { svg: "jetpack" }],
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
    ["f_green", "კლასიკური მწვანე", 0, { felt: ["#45c987", "#2fa36b", "#1f7a4e"] }],
    ["f_blue", "სამეფო ლურჯი", 120, { felt: ["#5aa2ff", "#2f6fd6", "#1d4a9c"] }],
    ["f_red", "კაზინოს წითელი", 120, { felt: ["#ff6b6b", "#d33a3a", "#8f1f1f"] }],
    ["f_purple", "იასამნისფერი", 120, { felt: ["#b98cff", "#7b4fd6", "#4d2a96"] }],
    ["f_pink", "ვარდისფერი", 150, { felt: ["#ff9ed2", "#ec5fa8", "#a8326f"] }],
    ["f_night", "შუაღამე", 150, { felt: ["#4a5a7a", "#27324a", "#131a2b"] }],
    ["f_gold", "ოქროს", 300, { felt: ["#ffe08a", "#e0a82e", "#9c6a12"] }],
  ],
};

/**
 * Where the face is on each head emoji, so gear lands on it: x/y shift the face
 * centre (fractions of the head box, +y is down), s scales face gear. Tuned to
 * sit well on both Apple and Google (Android) emoji; missing = a plain face.
 */
export const FACE_FIT = {
  "🐰": { y: 0.08, s: 0.9 }, "🐭": { y: 0.04 }, "🐔": { x: 0.03, s: 0.9 }, "🦄": { x: 0.04, y: 0.02, s: 0.85 },
  "🦉": { y: -0.04, s: 0.85 }, "🐸": { y: -0.03 },
  "🐧": { y: -0.14, s: 0.68 }, "🦖": { x: -0.12, y: -0.14, s: 0.62 }, "🦆": { x: -0.14, y: -0.18, s: 0.6 },
  "🐢": { y: -0.04, s: 0.6 }, "🦔": { x: -0.18, y: 0.04, s: 0.58 },
  "🦝": { y: -0.04, s: 0.8 }, "🐌": { x: 0.18, y: -0.06, s: 0.52 }, "🦀": { y: -0.1, s: 0.78 }, "🦥": { s: 0.8 },
  "🦩": { y: -0.3, s: 0.48 }, "🐳": { y: 0.02, s: 0.66 }, "🦦": { x: -0.1, s: 0.7 }, "🦒": { y: -0.16, s: 0.62 },
  "🐺": { s: 0.9 }, "🦈": { s: 0.68 }, "🧟": { y: -0.13, s: 0.66 }, "🧛": { y: -0.12, s: 0.68 },
  "🍷": { y: -0.16, s: 0.66 }, "🎅": { y: -0.03, s: 0.84 }, "🦨": { y: -0.04, s: 0.66 }, "🥷": { y: -0.08, s: 0.74 },
  "🧙": { y: 0.02, s: 0.72 }, "🦸": { y: -0.2, s: 0.52 }, "🦹": { y: -0.2, s: 0.52 }, "🥟": { y: 0.06, s: 0.86 },
  "🥔": { s: 0.86 }, "🧀": { y: 0.04, s: 0.84 }, "🤠": { y: 0.05, s: 0.9 },
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
