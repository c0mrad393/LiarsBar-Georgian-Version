// Achievements and the titles they unlock. Shared by the browser (profile,
// badges) and the server (the ledger counts them after each online game).
// Every achievement is "reach `goal` on stat `stat`".

export const ACHIEVEMENTS = [
  { id: "first_win", icon: "🏆", stat: "wins", goal: 1, name: "პირველი გამარჯვება", desc: "მოიგე ერთი თამაში", title: "დამწყები მატყუარა" },
  { id: "regular", icon: "🍺", stat: "games", goal: 10, name: "ბარის სტუმარი", desc: "ითამაშე 10 თამაში", title: "ბარის სტუმარი" },
  { id: "hunter", icon: "🎯", stat: "catches", goal: 20, name: "ბლეფის მონადირე", desc: "დაიჭირე 20 ბლეფი", title: "ბლეფის მონადირე" },
  { id: "poker", icon: "🎭", stat: "poker", goal: 10, name: "პოკერფეისი", desc: "10-ჯერ ტყუილად დაგადანაშაულეს", title: "პოკერფეისი" },
  { id: "bulletproof", icon: "🛡️", stat: "streak", goal: 5, name: "ტყვიაგაუმტარი", desc: "ერთ თამაშში 5-ჯერ გადარჩი", title: "ტყვიაგაუმტარი" },
  { id: "flawless", icon: "✨", stat: "flawless", goal: 1, name: "უნაკლო", desc: "მოიგე ისე, რომ რულეტთან არ დამჯდარხარ", title: "უნაკლო" },
  { id: "sommelier", icon: "🍷", stat: "wine", goal: 10, name: "სომელიე", desc: "ღვინის რულეტში 10-ჯერ გადარჩი", title: "სომელიე" },
  { id: "devil", icon: "😈", stat: "devils", goal: 5, name: "ეშმაკის მეგობარი", desc: "5-ჯერ გახსენი ეშმაკი", title: "ეშმაკის მეგობარი" },
  { id: "dice", icon: "🎲", stat: "diceWins", goal: 5, name: "კამათლის ოსტატი", desc: "მოიგე 5 თამაში კამათელში", title: "კამათლის ოსტატი" },
  { id: "chaos", icon: "🌀", stat: "chaosWins", goal: 5, name: "ქაოსის მბრძანებელი", desc: "მოიგე 5 თამაში ქაოსში", title: "ქაოსის მბრძანებელი" },
  { id: "lucky", icon: "🍀", stat: "survived", goal: 50, name: "იღბლის შვილი", desc: "სულ 50-ჯერ გადარჩი", title: "იღბლის შვილი" },
  { id: "veteran", icon: "🎖️", stat: "games", goal: 50, name: "ვეტერანი", desc: "ითამაშე 50 თამაში", title: "ბარის ვეტერანი" },
  { id: "king", icon: "👑", stat: "wins", goal: 25, name: "ბარის მეფე", desc: "მოიგე 25 თამაში", title: "ბარის მეფე" },
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Counters kept beside the ledger's own columns (games, wins, survived, catches). */
export const EXTRA_STATS = ["poker", "streak", "flawless", "wine", "devils", "diceWins", "chaosWins"];

/** Ids of the achievements these stats have reached. */
export const unlocked = (stats) => ACHIEVEMENTS.filter((a) => (stats?.[a.stat] || 0) >= a.goal).map((a) => a.id);

/** A title a player may wear: an achievement they have. */
export const validTitle = (id, stats) => (id && ACH[id] && unlocked(stats).includes(id) ? id : null);
