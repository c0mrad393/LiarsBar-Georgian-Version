// The matchmaker: one global SQLite Durable Object that knows which public
// tables are open. Rooms report themselves while their lobby is public and
// waiting; "quick play" picks the fullest open table for a mode, or reserves a
// fresh code that the first player then opens as a public room.
import { DurableObject } from "cloudflare:workers";

const PENDING_MS = 60 * 1000; // a reserved code nobody opened
const STALE_MS = 30 * 60 * 1000; // a lobby that stopped reporting
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const LIST_SIZE = 12;

const newCode = (prefix) => prefix + Array.from({ length: 6 }, () => ALPHABET[(Math.random() * ALPHABET.length) | 0]).join("");

export class Matchmaker extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS tables (
        code TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        host TEXT NOT NULL DEFAULT '',
        avatar TEXT NOT NULL DEFAULT '',
        players INTEGER NOT NULL DEFAULT 0,
        max INTEGER NOT NULL DEFAULT 6,
        test INTEGER NOT NULL DEFAULT 0,
        updated INTEGER NOT NULL
      );
    `);
  }

  purge(now) {
    this.sql.exec("DELETE FROM tables WHERE (host = '' AND updated < ?) OR updated < ?", now - PENDING_MS, now - STALE_MS);
  }

  /** A table to sit at: { code, mode, fresh } (fresh = nobody there yet, the caller opens it). */
  find(mode, modes, test = false) {
    const now = Date.now();
    this.purge(now);
    const any = !modes.includes(mode);
    const row = this.sql
      .exec(
        `SELECT code, mode FROM tables WHERE players < max AND test = ? ${any ? "" : "AND mode = ?"}
         ORDER BY players DESC, updated DESC LIMIT 1`,
        ...(any ? [test ? 1 : 0] : [test ? 1 : 0, mode]),
      )
      .toArray()[0];
    if (row) {
      // Count the newcomer now, so a burst of quick-players spreads correctly
      // until the room reports its real numbers.
      this.sql.exec("UPDATE tables SET players = players + 1, updated = ? WHERE code = ?", now, row.code);
      return { code: row.code, mode: row.mode, fresh: false };
    }
    const m = any ? modes[0] : mode;
    const code = newCode(test ? "zz" : "p");
    this.sql.exec("INSERT INTO tables (code, mode, players, test, updated) VALUES (?, ?, 1, ?, ?)", code, m, test ? 1 : 0, now);
    return { code, mode: m, fresh: true };
  }

  /** Open public tables, fullest first. */
  list() {
    const now = Date.now();
    this.purge(now);
    return this.sql
      .exec("SELECT code, mode, host, avatar, players, max FROM tables WHERE test = 0 AND players > 0 AND players < max AND host != '' ORDER BY players DESC, updated DESC LIMIT ?", LIST_SIZE)
      .toArray();
  }

  /** A public room's lobby changed. players = 0 (or open = false) takes it off the list. */
  report(code, info) {
    if (!info || !info.open || !(info.players > 0)) {
      this.sql.exec("DELETE FROM tables WHERE code = ?", code);
      return;
    }
    this.sql.exec(
      `INSERT INTO tables (code, mode, host, avatar, players, max, test, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET mode = excluded.mode, host = excluded.host, avatar = excluded.avatar,
         players = excluded.players, max = excluded.max, updated = excluded.updated`,
      code, info.mode, info.host, info.avatar, info.players, info.max, code.startsWith("zz") ? 1 : 0, Date.now(),
    );
  }
}
