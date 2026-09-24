// The ledger: player profiles, coins and leaderboards in one SQLite-backed
// Durable Object (a single global instance). Players are identified by the
// SHA-256 of their secret key; the key itself never reaches storage.
import { DurableObject } from "cloudflare:workers";

export const REWARD = { seat: 10, win: 50, safe: 5, catch: 10, devil: 15 };
export const DAILY_BONUS = 25;
export const DAILY_CAP = 600; // most coins one player can earn from games per UTC day
const BOARD_SIZE = 50;

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
    `);
  }

  row(id) {
    return this.sql.exec("SELECT * FROM players WHERE id = ?", id).toArray()[0] || null;
  }

  shape(r) {
    const wk = isoWeek();
    return {
      name: r.name,
      avatar: r.avatar,
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
