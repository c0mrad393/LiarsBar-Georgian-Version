// The ledger: player profiles, coins and leaderboards in one SQLite-backed
// Durable Object (a single global instance). Players are identified by the
// SHA-256 of their secret key; the key itself never reaches storage.
import { DurableObject } from "cloudflare:workers";
import { ALL_AVATARS, FREE_AVATARS, ITEMS, cleanLooks, headOf, owns } from "../src/shop.js";

export const REWARD = { seat: 10, win: 50, safe: 5, catch: 10, devil: 15 };
export const DAILY_BONUS = 25;
export const DAILY_CAP = 600; // most coins one player can earn from games per UTC day
const ADMIN_MAX_FAILS = 5; // wrong admin passwords per hour before the door locks
const BOARD_SIZE = 50;

// Premium emoji heads sold before the drawn characters replaced them (2026-09-26).
// Owners get the coins back once; see migrateHeads().
const LEGACY_HEAD_PRICES = {
  "🦝": 60, "🐌": 60, "🦀": 80, "🦥": 80, "🦩": 90, "🐳": 100, "🦦": 100, "🦒": 100, "🎃": 110, "🐺": 120,
  "🦈": 120, "👽": 130, "🤖": 130, "🐲": 160, "🤡": 160, "🧟": 170, "🧛": 170, "🥔": 180, "🧀": 200, "🍷": 200,
  "🤠": 220, "🥸": 240, "🎅": 250, "🦨": 260, "🥷": 280, "🧙": 300, "🦸": 320, "👹": 350, "🥟": 400, "🦹": 450,
};

const today = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
/** ISO week, e.g. "2026-W39" (weeks start Monday 00:00 UTC). */
export function isoWeek(t = Date.now()) {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThu) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export class Ledger extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        coins INTEGER NOT NULL DEFAULT 0,
        earned INTEGER NOT NULL DEFAULT 0,
        games INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        survived INTEGER NOT NULL DEFAULT 0,
        catches INTEGER NOT NULL DEFAULT 0,
        week TEXT NOT NULL DEFAULT '',
        week_coins INTEGER NOT NULL DEFAULT 0,
        week_wins INTEGER NOT NULL DEFAULT 0,
        day TEXT NOT NULL DEFAULT '',
        day_earned INTEGER NOT NULL DEFAULT 0,
        last_daily TEXT NOT NULL DEFAULT '',
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS players_earned ON players (earned DESC);
      CREATE INDEX IF NOT EXISTS players_week ON players (week, week_coins DESC);
      CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS owned (player TEXT NOT NULL, item TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (player, item));
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
    `);
    const cols = this.sql.exec("PRAGMA table_info(players)").toArray().map((c) => c.name);
    if (!cols.includes("looks")) this.sql.exec("ALTER TABLE players ADD COLUMN looks TEXT NOT NULL DEFAULT '{}'");
    this.migrateHeads();
  }

  /**
   * Emoji heads → drawn characters: refund every premium head that was bought
   * (spendable coins only, leaderboards untouched) and move everyone onto a
   * character. Runs once; the kv flag and the deleted rows make it idempotent.
   */
  migrateHeads() {
    if (this.sql.exec("SELECT 1 FROM kv WHERE k = 'heads_v2'").toArray().length) return;
    this.ctx.storage.transactionSync(() => {
      for (const [item, price] of Object.entries(LEGACY_HEAD_PRICES)) {
        for (const { player } of this.sql.exec("SELECT player FROM owned WHERE item = ?", item).toArray()) {
          this.sql.exec("UPDATE players SET coins = coins + ? WHERE id = ?", price, player);
        }
        this.sql.exec("DELETE FROM owned WHERE item = ?", item);
      }
      for (const { avatar } of this.sql.exec("SELECT DISTINCT avatar FROM players").toArray()) {
        if (headOf(avatar) !== avatar) this.sql.exec("UPDATE players SET avatar = ? WHERE avatar = ?", headOf(avatar), avatar);
      }
      this.sql.exec("INSERT INTO kv (k, v) VALUES ('heads_v2', ?)", String(Date.now()));
    });
  }

  ownedBy(id) {
    return this.sql.exec("SELECT item FROM owned WHERE player = ?", id).toArray().map((r) => r.item);
  }
  looksOf(r) {
    try { return JSON.parse(r.looks || "{}"); } catch { return {}; }
  }
  /** A head the player may wear: owned (or free), else keep what they had. */
  validAvatar(avatar, owned, fallback) {
    return ALL_AVATARS.includes(avatar) && owns(owned, avatar) ? avatar : fallback;
  }

  row(id) {
    return this.sql.exec("SELECT * FROM players WHERE id = ?", id).toArray()[0] || null;
  }

  shape(r) {
    const wk = isoWeek();
    const owned = this.ownedBy(r.id);
    return {
      name: r.name,
      avatar: r.avatar,
      looks: cleanLooks(this.looksOf(r), owned),
      owned,
      coins: r.coins,
      earned: r.earned,
      games: r.games,
      wins: r.wins,
      survived: r.survived,
      catches: r.catches,
      weekCoins: r.week === wk ? r.week_coins : 0,
      weekWins: r.week === wk ? r.week_wins : 0,
      dailyReady: r.last_daily !== today(),
    };
  }

  /** Create or rename a player; returns their profile. */
  upsert(id, name, avatar) {
    const now = Date.now();
    const old = this.row(id);
    avatar = this.validAvatar(avatar, old ? this.ownedBy(id) : [], headOf(old?.avatar || FREE_AVATARS[0]));
    this.sql.exec(
      `INSERT INTO players (id, name, avatar, created, updated) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, updated = excluded.updated`,
      id, name, avatar, now, now,
    );
    return this.shape(this.row(id));
  }

  profile(id) {
    const r = this.row(id);
    return r ? this.shape(r) : null;
  }

  /** What a room needs to dress this player: validated head, gear, throwables owned. */
  gear(id) {
    const r = this.row(id);
    if (!r) return null;
    const owned = this.ownedBy(id);
    return { avatar: r.avatar, looks: cleanLooks(this.looksOf(r), owned), owned };
  }

  /** Buy one item. Returns { ok, profile } or { ok: false, error: unknown|owned|poor }. */
  buy(id, itemId) {
    return this.ctx.storage.transactionSync(() => {
      const r = this.row(id);
      const item = ITEMS[itemId];
      if (!r || !item) return { ok: false, error: "unknown" };
      if (item.price === 0 || this.ownedBy(id).includes(itemId)) return { ok: false, error: "owned", profile: this.shape(r) };
      if (r.coins < item.price) return { ok: false, error: "poor", profile: this.shape(r) };
      const now = Date.now();
      this.sql.exec("UPDATE players SET coins = coins - ?, updated = ? WHERE id = ?", item.price, now, id);
      this.sql.exec("INSERT INTO owned (player, item, at) VALUES (?, ?, ?)", id, itemId, now);
      return { ok: true, profile: this.shape(this.row(id)) };
    });
  }

  /** Put on gear (and optionally a head). Anything not owned or in the wrong slot is dropped. */
  equip(id, looks, avatar) {
    const r = this.row(id);
    if (!r) return null;
    const owned = this.ownedBy(id);
    const clean = cleanLooks(looks, owned);
    const head = avatar ? this.validAvatar(avatar, owned, r.avatar) : r.avatar;
    this.sql.exec("UPDATE players SET looks = ?, avatar = ?, updated = ? WHERE id = ?", JSON.stringify(clean), head, Date.now(), id);
    return this.shape(this.row(id));
  }

  /**
   * The owner's secret coin tap. `ok(token)` is checked by the caller; this only
   * counts failures so a guessed password locks the door for an hour.
   * Granted coins are spendable but never count towards the leaderboards.
   */
  adminLocked() {
    const w = this.sql.exec("SELECT v FROM kv WHERE k = 'admin_fails'").toArray()[0];
    if (!w) return false;
    const { n, since } = JSON.parse(w.v);
    return Date.now() - since < 3600e3 && n >= ADMIN_MAX_FAILS;
  }
  adminFail() {
    const w = this.sql.exec("SELECT v FROM kv WHERE k = 'admin_fails'").toArray()[0];
    let st = w ? JSON.parse(w.v) : { n: 0, since: Date.now() };
    if (Date.now() - st.since >= 3600e3) st = { n: 0, since: Date.now() };
    st.n += 1;
    this.sql.exec("INSERT INTO kv (k, v) VALUES ('admin_fails', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", JSON.stringify(st));
  }
  grant(id, amount) {
    const r = this.row(id);
    if (!r) return null;
    this.sql.exec("UPDATE players SET coins = coins + ?, updated = ? WHERE id = ?", amount, Date.now(), id);
    return this.shape(this.row(id));
  }

  daily(id) {
    const r = this.row(id);
    if (!r) return null;
    if (r.last_daily === today()) return { ok: false, profile: this.shape(r) };
    this.sql.exec("UPDATE players SET coins = coins + ?, last_daily = ?, updated = ? WHERE id = ?", DAILY_BONUS, today(), Date.now(), id);
    return { ok: true, got: DAILY_BONUS, profile: this.shape(this.row(id)) };
  }

  /**
   * Pay out one finished game, once (idempotent per gameId).
   * results: [{ id, name, avatar, amount, win, safe, catches }]
   * Returns { [id]: { got, coins } } or null if this game was already paid.
   */
  award(gameId, results) {
    return this.ctx.storage.transactionSync(() => {
      if (this.sql.exec("SELECT 1 FROM games WHERE id = ?", gameId).toArray().length) return null;
      const now = Date.now();
      this.sql.exec("INSERT INTO games (id, at) VALUES (?, ?)", gameId, now);
      const wk = isoWeek(now);
      const day = today(now);
      const out = {};
      for (const p of results) {
        this.upsert(p.id, p.name, p.avatar);
        const r = this.row(p.id);
        const dayEarned = r.day === day ? r.day_earned : 0;
        const got = Math.max(0, Math.min(p.amount, DAILY_CAP - dayEarned));
        const weekCoins = (r.week === wk ? r.week_coins : 0) + got;
        const weekWins = (r.week === wk ? r.week_wins : 0) + (p.win ? 1 : 0);
        this.sql.exec(
          `UPDATE players SET coins = coins + ?, earned = earned + ?, games = games + 1, wins = wins + ?,
             survived = survived + ?, catches = catches + ?, week = ?, week_coins = ?, week_wins = ?,
             day = ?, day_earned = ?, updated = ? WHERE id = ?`,
          got, got, p.win ? 1 : 0, p.safe, p.catches, wk, weekCoins, weekWins, day, dayEarned + got, now, p.id,
        );
        out[p.id] = { got, coins: r.coins + got, capped: got < p.amount };
      }
      // Keep the idempotency table small.
      this.sql.exec("DELETE FROM games WHERE at < ?", now - 7 * 864e5);
      return out;
    });
  }

  /** Top players for "week" or "all", plus the caller's own rank. */
  board(period, meId) {
    const wk = isoWeek();
    const week = period === "week";
    const top = week
      ? this.sql.exec("SELECT id, name, avatar, week_coins AS score, week_wins AS wins FROM players WHERE week = ? AND week_coins > 0 ORDER BY week_coins DESC, updated ASC LIMIT ?", wk, BOARD_SIZE).toArray()
      : this.sql.exec("SELECT id, name, avatar, earned AS score, wins FROM players WHERE earned > 0 ORDER BY earned DESC, updated ASC LIMIT ?", BOARD_SIZE).toArray();
    let me = null;
    if (meId) {
      const r = this.row(meId);
      const score = r ? (week ? (r.week === wk ? r.week_coins : 0) : r.earned) : 0;
      if (r && score > 0) {
        const ahead = week
          ? this.sql.exec("SELECT COUNT(*) AS n FROM players WHERE week = ? AND week_coins > ?", wk, score).one().n
          : this.sql.exec("SELECT COUNT(*) AS n FROM players WHERE earned > ?", score).one().n;
        me = { rank: ahead + 1, name: r.name, avatar: r.avatar, score, wins: week ? (r.week === wk ? r.week_wins : 0) : r.wins };
      }
    }
    return {
      period: week ? "week" : "all",
      week: wk,
      top: top.map((r, i) => ({ rank: i + 1, name: r.name, avatar: r.avatar, score: r.score, wins: r.wins, me: r.id === meId })),
      me,
    };
  }
}
