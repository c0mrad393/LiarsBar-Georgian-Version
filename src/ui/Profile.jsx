// Coins chip, profile sheet (stats, daily bonus, recovery code) and the leaderboard.
import { useEffect, useState } from "react";
import { accountKey, fetchBoard } from "../account.js";
import { T } from "../i18n.js";
import { fmtKey } from "../shared.js";
import { sfx } from "../sfx.js";
import Character, { seatColor } from "./Character.jsx";
import { Btn } from "./parts.jsx";

export function CoinChip({ coins, onClick, className = "" }) {
  return (
    <button onClick={onClick} className={`comic-sm flex h-10 items-center gap-1.5 rounded-full bg-sun px-3 text-sm font-black transition-transform active:scale-95 ${className}`} aria-label={`${coins ?? 0} ${T.coins}`}>
      <span className="a-bob inline-block">🪙</span>
      <span className="tabular-nums">{coins ?? "…"}</span>
    </button>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="a-fade-up fixed inset-0 z-[85] flex items-end justify-center bg-ink/45 backdrop-blur-[3px] sm:items-center sm:px-4" onClick={onClose}>
      <div className="a-sheet comic safe-b flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[2rem] bg-paper p-5 sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} className="comic-sm flex h-9 w-9 items-center justify-center rounded-full bg-cream font-black" aria-label={T.close}>✕</button>
        </div>
        <div className="no-scrollbar -mx-1 overflow-y-auto px-1">{children}</div>
      </div>
    </div>
  );
}

function CoinRain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, i) => (
        <span key={i} className="a-confetti absolute top-0 text-2xl"
          style={{ left: `${(i * 37) % 100}%`, "--dx": `${((i * 13) % 20) - 10}vw`, "--rot": `${(i % 2 ? 1 : -1) * 540}deg`, "--dur": `${1.8 + (i % 5) * 0.3}s`, "--delay": `${(i % 7) * 0.08}s` }}>🪙</span>
      ))}
    </div>
  );
}

export function ProfileSheet({ account, profile, setProfile, onClose }) {
  const { me, error, claimDaily, restore } = account;
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [rain, setRain] = useState(0);
  const key = accountKey();

  const daily = async () => {
    try {
      const r = await claimDaily();
      if (r.ok) { sfx("win"); setRain(Date.now()); }
    } catch { setMsg(T.offlineProfile); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(fmtKey(key)); setCopied(true); sfx("pop"); setTimeout(() => setCopied(false), 1500); } catch { setShowKey(true); }
  };
  const doRestore = async () => {
    try {
      const p = await restore(code);
      setProfile({ name: p.name, avatar: p.avatar });
      setMsg(T.restored);
      setCode("");
      sfx("win");
    } catch {
      setMsg(T.restoreFail);
      sfx("bluff");
    }
  };

  const stats = me
    ? [[T.gamesPlayed, me.games, "🎲"], [T.winsN, me.wins, "🏆"], [T.survivedN, me.survived, "😅"], [T.catchesN, me.catches, "🕵️"]]
    : [];

  return (
    <Modal title={`👤 ${T.profile}`} onClose={onClose}>
      {rain ? <CoinRain key={rain} /> : null}
      <div className="flex items-center gap-4">
        <Character avatar={profile.avatar} color={seatColor(0)} size={76} state={me?.dailyReady ? "happy" : "idle"} />
        <div className="min-w-0">
          <div className="truncate text-xl font-black">{profile.name || "…"}</div>
          <div className="mt-1 flex items-center gap-1.5 text-2xl font-black"><span className="a-bob inline-block">🪙</span><span className="tabular-nums">{me?.coins ?? 0}</span></div>
          {me && <div className="text-xs font-bold text-ink-soft">{T.thisWeek}: {me.weekCoins} 🪙 · {me.weekWins} 🏆</div>}
        </div>
      </div>

      {error && !me && <p className="mt-3 rounded-2xl bg-[#ffe1e2] px-3 py-2 text-sm font-bold">{T.offlineProfile}</p>}

      {me && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stats.map(([label, n, icon]) => (
              <div key={label} className="rounded-2xl border-2 border-ink bg-cream px-3 py-2">
                <div className="text-lg font-black">{icon} {n}</div>
                <div className="text-[11px] font-bold text-ink-soft">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/40 px-3 py-3 text-center">
            <div className="text-sm font-black">🎁 {T.daily}</div>
            {me.dailyReady ? (
              <Btn color="sun" onClick={daily} className="a-hop mt-2 px-6 py-2.5">{T.dailyClaim}</Btn>
            ) : (
              <div className="mt-1 text-xs font-bold text-ink-soft">{T.dailyDone}</div>
            )}
          </div>
        </>
      )}

      <div className="mt-4 rounded-2xl border-2 border-ink bg-cream px-3 py-3">
        <div className="text-sm font-black">🔑 {T.recovery}</div>
        <div className="mt-1 text-[11px] font-bold text-ink-soft">{T.recoveryHint}</div>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl border-2 border-ink bg-paper px-2 py-1.5 text-center font-mono text-sm font-bold tracking-wider">
            {showKey ? fmtKey(key) : "••••-••••-••••-••••-••••"}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="comic-sm rounded-xl bg-paper px-2 py-1.5 text-xs font-black">{showKey ? "🙈" : `👁 ${T.show}`}</button>
          <button onClick={copy} className="comic-sm rounded-xl bg-paper px-2 py-1.5 text-xs font-black">{copied ? "✓" : "📋"}</button>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm font-black">📲 {T.restoreTitle}</div>
        <div className="mt-2 flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={T.restorePh} autoCapitalize="characters" spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border-[2.5px] border-ink bg-paper px-2 py-2 font-mono text-sm font-bold uppercase outline-none" aria-label={T.restoreTitle} />
          <Btn color="mint" onClick={doRestore} disabled={code.replace(/[^a-z0-9]/gi, "").length < 20} className="px-3 py-2 text-sm">{T.restore}</Btn>
        </div>
        {msg && <p className="a-pop mt-2 text-sm font-black">{msg}</p>}
      </div>
    </Modal>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function Leaderboard({ onClose }) {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(false);
    fetchBoard(period).then((d) => live && setData(d)).catch(() => live && setError(true));
    return () => { live = false; };
  }, [period]);

  const Row = ({ r, highlight }) => (
    <div className={`flex items-center gap-2.5 rounded-2xl border-2 px-2.5 py-1.5 ${highlight ? "border-ink bg-sun" : "border-transparent bg-cream"}`}>
      <span className="w-8 text-center text-lg font-black tabular-nums">{MEDAL[r.rank - 1] || r.rank}</span>
      <span className="text-2xl">{r.avatar}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-black">{r.name}{highlight ? ` (${T.you})` : ""}</span>
      <span className="text-xs font-bold text-ink-soft">🏆 {r.wins}</span>
      <span className="min-w-[4.5ch] text-right text-sm font-black tabular-nums">🪙 {r.score}</span>
    </div>
  );

  return (
    <Modal title={`🏆 ${T.leaderboard}`} onClose={onClose}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {[["week", T.thisWeek], ["all", T.allTime]].map(([k, label]) => (
          <button key={k} onClick={() => { setPeriod(k); sfx("select"); }} aria-pressed={period === k}
            className={`rounded-2xl border-[2.5px] border-ink py-2 text-sm font-black ${period === k ? "bg-sun" : "bg-cream opacity-70"}`}
            style={{ boxShadow: period === k ? "0 3px 0 #2b1d14" : "none" }}>
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="py-6 text-center text-sm font-bold">{T.offlineProfile}</p>
      ) : !data ? (
        <p className="py-6 text-center text-2xl"><span className="a-wiggle inline-block">🪙</span></p>
      ) : !data.top.length ? (
        <p className="py-6 text-center text-sm font-bold text-ink-soft">{T.boardEmpty}</p>
      ) : (
        <div className="space-y-1.5">
          {data.top.map((r) => <Row key={r.rank} r={r} highlight={r.me} />)}
          {data.me && !data.top.some((r) => r.me) && (
            <>
              <div className="py-1 text-center text-xs font-black text-ink-soft">⋯ {T.yourRank} ⋯</div>
              <Row r={data.me} highlight />
            </>
          )}
        </div>
      )}
      {period === "week" && <p className="mt-3 text-center text-[11px] font-bold text-ink-soft">{T.weekResets}</p>}
    </Modal>
  );
}
