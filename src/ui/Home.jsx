import { Suspense, lazy, useEffect, useState } from "react";
import { AVATARS, MODE_INFO, RULES, T } from "../i18n.js";
import { ITEMS } from "../shop.js";
import { cleanCode } from "../shared.js";
import { fetchTables } from "../online.js";
import { useMusic } from "../music.js";
import { sfx } from "../sfx.js";
import { Card } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
import { PERSONAS } from "../engine.js";
import { BOT_LOOKS } from "../shared.js";
import BarScene from "./BarScene.jsx";
import { Face } from "./heads.jsx";
import { Btn, CoinChip, Sheet, SoundToggle, Stepper, TitleTag } from "./parts.jsx";

// Loaded on first open: keeps the first screen light on phones.
const Shop = lazy(() => import("./Shop.jsx"));
const ProfileSheet = lazy(() => import("./Profile.jsx").then((m) => ({ default: m.ProfileSheet })));
const Leaderboard = lazy(() => import("./Profile.jsx").then((m) => ({ default: m.Leaderboard })));

/** Each mode's tile colours: [picked, not picked, text on picked is light]. */
export const MODE_SKIN = {
  classic: ["bg-sun", "bg-cream", false],
  devil: ["bg-[#2a0508]", "bg-[#f3dada]", true],
  chaos: ["bg-[#6a2bb8]", "bg-[#efe3fb]", true],
  dice: ["bg-[#1d5fc4]", "bg-[#e1ecfc]", true],
};

export function ModePicker({ mode, setMode, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(MODE_INFO).map(([k, m]) => {
        const on = mode === k;
        const [onBg, offBg, light] = MODE_SKIN[k];
        return (
          <button
            key={k}
            disabled={disabled}
            onClick={() => { setMode(k); sfx(k === "devil" ? "devil" : k === "chaos" ? "joker" : "select"); }}
            aria-pressed={on}
            className={`flex flex-col justify-start rounded-2xl border-[2.5px] border-ink px-3 py-2.5 text-left transition-transform ${on ? "-translate-y-0.5" : "hover:-translate-y-0.5"} ${on ? onBg : offBg} ${on && light ? "text-white" : ""}`}
            style={{ boxShadow: on ? "0 4px 0 #2b1d14" : "0 2px 0 #2b1d14" }}>
            <div className="text-sm font-black"><span className={on ? "a-hop inline-block" : "inline-block"}>{m.emoji}</span> {m.name}</div>
            <div className={`mt-0.5 text-xs font-semibold leading-snug ${on ? (light ? "text-white/85" : "text-ink") : "text-ink-soft"}`}>{m.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

/** Open public tables, refreshed while the sheet is open. */
function OpenTables({ onJoin }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchTables().then((l) => alive && setList(l)).catch(() => alive && setList((x) => x || []));
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!list) return <div className="py-3 text-center text-sm font-bold text-ink-soft"><span className="a-wiggle inline-block">🔎</span></div>;
  if (!list.length) return <p className="rounded-2xl bg-cream px-3 py-2.5 text-center text-xs font-bold text-ink-soft">{T.noTables}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {list.map((t) => (
        <li key={t.code} className="a-fade-up flex items-center gap-2 rounded-2xl border-[2.5px] border-ink bg-cream py-1.5 pl-2 pr-1.5">
          <Face id={t.avatar} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-black">{t.host}</div>
            <div className="text-[11px] font-bold text-ink-soft">{MODE_INFO[t.mode]?.emoji} {MODE_INFO[t.mode]?.name} · 👥 {t.players}/{t.max}</div>
          </div>
          <Btn color="mint" onClick={() => onJoin(t.code)} className="px-3 py-1.5 text-sm">{T.sit}</Btn>
        </li>
      ))}
    </ul>
  );
}

/** The home screen's neon sign on a swinging wooden board. */
function Sign() {
  return (
    <div className="flex flex-col items-center pt-5">
      <div className="sign-swing relative">
        <svg className="absolute -top-7 left-1/2 -translate-x-1/2" width="170" height="30" aria-hidden="true">
          <path d="M85 2L14 28M85 2L156 28" stroke="#2b1d14" strokeWidth="2.5" fill="none" />
          <circle cx="85" cy="3" r="3.5" fill="#2b1d14" />
        </svg>
        <div className="wood comic rounded-2xl px-4 py-2.5 text-center short:py-1.5">
          <h1 className="neon whitespace-nowrap text-[27px] font-black leading-tight min-[400px]:text-[32px] sm:text-5xl">{T.title}</h1>
          <p className="font-display text-sm tracking-wide text-sun">{T.tagline}</p>
        </div>
      </div>
    </div>
  );
}

const COUNTER_BOTS = ["fox", "pig", "bear", "bull"];
const COUNTER_MOODS = ["idle", "talk", "happy", "turn", "idle", "win"];

/**
 * You at the bar counter, with the bots hanging around: they chat, cheer and
 * look about. Tap yourself to change name and look.
 */
function BarCounter({ profile, looks, onEdit, children }) {
  const [moods, setMoods] = useState(["idle", "idle", "idle", "idle"]);
  useEffect(() => {
    const t = setInterval(() => {
      setMoods((m) => m.map((x, i) => (Math.random() < 0.35 ? COUNTER_MOODS[(Math.random() * COUNTER_MOODS.length) | 0] : i % 2 ? x : "idle")));
    }, 2600);
    return () => clearInterval(t);
  }, []);
  const spots = [["8%", 50, 0], ["24%", 58, 1], ["76%", 58, 2], ["92%", 50, 3]];
  return (
    <div className="relative mx-auto h-[196px] w-full max-w-sm short:h-[164px]">
      {spots.map(([left, size, i]) => {
        const k = COUNTER_BOTS[i];
        return (
          <div key={k} className="absolute bottom-[46px] -translate-x-1/2" style={{ left, zIndex: 1 }}>
            <Character avatar={PERSONAS[k].avatar} looks={BOT_LOOKS[k]} color={seatColor(i + 1)} size={size} state={moods[i]} />
          </div>
        );
      })}
      <button onClick={onEdit} aria-label={T.editProfile} className="absolute bottom-[40px] left-1/2 z-[2] -translate-x-1/2 transition-transform active:scale-95">
        <Character avatar={profile.avatar} looks={looks} color={seatColor(0)} size={92} state="happy" />
      </button>
      {/* the counter */}
      <div className="absolute inset-x-0 bottom-0 z-[3]">
        <div className="relative mx-2 h-3 rounded-t-lg border-[3px] border-b-0 border-ink bg-[#c07d3f]">
          <span className="absolute -top-6 left-[15%] text-xl">🍷</span>
          <span className="absolute -top-6 right-[14%] text-xl">🍺</span>
          <span className="absolute -top-5 left-[33%] text-base">🥟</span>
        </div>
        <div className="wood comic flex h-[46px] items-center justify-center rounded-b-2xl rounded-t-md px-3">{children}</div>
      </div>
    </div>
  );
}

export function Logo({ small }) {
  return (
    <div className="flex flex-col items-center text-center">
      {!small && (
        <div className="relative mb-1 h-24 w-44 short:h-20">
          {[["A", "S"], ["J"], ["K", "H"]].map(([r, suit], i) => (
            <div key={r} className="a-deal absolute left-1/2 top-1" style={{ animationDelay: `${i * 120}ms`, marginLeft: -31 + (i - 1) * 32 }}>
              <div style={{ transform: `rotate(${(i - 1) * 16}deg) translateY(${Math.abs(i - 1) * 8}px)` }}>
                <Card rank={r} suit={suit} size="md" />
              </div>
            </div>
          ))}
        </div>
      )}
      <h1 className={`font-black tracking-tight text-ink ${small ? "text-xl" : "text-4xl sm:text-5xl"}`} style={{ textShadow: small ? "none" : "3px 3px 0 #ffc83d" }}>
        {T.title}
      </h1>
      {!small && <p className="mt-1 font-display text-base tracking-wide text-coral sm:text-lg">{T.tagline}</p>}
    </div>
  );
}

function NameInput({ value, onChange, autoFocus, compact }) {
  return (
    <input
      id="nm"
      value={value}
      maxLength={16}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={T.namePh}
      aria-label={T.yourName}
      className={`w-full rounded-2xl border-[3px] border-ink bg-cream font-bold outline-none focus:bg-white ${compact ? "px-3 py-1 text-base" : "px-4 py-3 text-lg"}`}
    />
  );
}

export default function Home({ profile, setProfile, account, mode, setMode, soloBots, setSoloBots, invite, onSolo, onHost, onQuick, onJoin, onDropInvite }) {
  useMusic("bar");
  const [quickMode, setQuickMode] = useState(() => {
    try { const m = localStorage.getItem("lb-quick"); return m === "any" || MODE_INFO[m] ? m : "any"; } catch { return "any"; }
  });
  const pickQuick = (m) => { setQuickMode(m); sfx("select"); try { localStorage.setItem("lb-quick", m); } catch { /* private mode */ } };
  const [panel, setPanel] = useState(null); // profile | board | shop (lazy)
  const [sheet, setSheet] = useState(null); // me | solo | friends | rules
  const [shopCat, setShopCat] = useState("hat");
  const openShop = (cat = "hat") => { setSheet(null); setShopCat(cat); setPanel("shop"); };
  const myHeads = [...new Set([...AVATARS, ...(account.me?.owned || []).filter((id) => ITEMS[id]?.cat === "head")])];
  const [code, setCode] = useState(invite || "");
  // Android/Chrome offers "install" (fullscreen app on the home screen) via this event.
  const [installEv, setInstallEv] = useState(null);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEv(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const setName = (name) => setProfile({ ...profile, name });
  const ready = profile.name.trim().length > 0;
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  const open = (s) => { setSheet(s); sfx("select"); };
  const looks = account.me?.looks;

  return (
    <div className="safe-b relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pt-3">
      <BarScene mode={mode} />
      <div className="safe-t relative z-10 flex items-center justify-between gap-2">
        <CoinChip coins={account.me?.coins ?? (account.error ? "—" : 0)} onClick={() => setPanel("profile")} className={account.me?.dailyReady ? "a-hop" : ""} />
        <div className="flex items-center gap-2">
          <button onClick={() => openShop()} className="comic-sm flex h-10 items-center gap-1 rounded-full bg-coral px-3 text-sm font-black text-white" aria-label={T.shop}>🛍️<span className="hidden sm:inline">{T.shop}</span></button>
          <button onClick={() => setPanel("board")} className="comic-sm flex h-10 w-10 items-center justify-center rounded-full bg-paper text-lg" aria-label={T.leaderboard}>🏆</button>
          <SoundToggle />
        </div>
      </div>

      <Suspense fallback={<div className="fixed inset-0 z-[85] flex items-center justify-center bg-ink/30"><span className="a-hop text-5xl">🍻</span></div>}>
        {panel === "profile" && <ProfileSheet account={account} profile={profile} setProfile={setProfile} onClose={() => setPanel(null)} />}
        {panel === "board" && <Leaderboard onClose={() => setPanel(null)} />}
        {panel === "shop" && <Shop account={account} profile={profile} setProfile={setProfile} startCat={shopCat} onClose={() => setPanel(null)} />}
      </Suspense>

      <main className="relative z-10 flex flex-1 flex-col justify-center gap-4 py-4 short:gap-2 short:py-2">
        <div className="a-fade-up"><Sign /></div>

        {!online && <div className="a-pop rounded-2xl border-[2.5px] border-ink bg-cream px-4 py-2 text-center text-xs font-black">📴 {T.offlineNow}</div>}

        {invite && (
          <div className="a-pop comic rounded-3xl bg-sun px-5 py-3 text-center">
            <div className="text-xl font-black">{T.invited}</div>
            <div className="mt-1 inline-block rounded-full border-2 border-ink bg-paper px-3 py-0.5 font-mono text-sm font-bold">{T.roomCode}: {invite}</div>
          </div>
        )}

        <BarCounter profile={profile} looks={looks} onEdit={() => open("me")}>
          {ready ? (
            <button onClick={() => open("me")} className="flex min-w-0 items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-paper px-3 py-1 text-base font-black" aria-label={T.editProfile}>
              {account.me?.title && <TitleTag id={account.me.title} short />}
              <span className="truncate">{profile.name}</span><span className="text-xs">✏️</span>
            </button>
          ) : (
            <div className="w-full max-w-[240px]"><NameInput value={profile.name} onChange={setName} compact /></div>
          )}
        </BarCounter>

        {invite ? (
          <div className="flex flex-col gap-2">
            <Btn color="coral" disabled={!ready || !online} onClick={() => onJoin(invite)} className="py-4 text-xl">🍻 {T.join}</Btn>
            <button onClick={onDropInvite} className="py-1 text-sm font-bold text-ink-soft underline decoration-2 underline-offset-4">{T.menu}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Btn color="sun" disabled={!ready} onClick={() => open("solo")} className="btn-shine flex flex-col items-center gap-1 px-2 py-4">
              <span className="a-bob inline-block text-4xl">🤖</span>
              <span className="text-base leading-tight">{T.withBots}</span>
              <span className="text-xs font-bold opacity-70">{soloBots + 1} {T.players} · {MODE_INFO[mode].emoji}</span>
            </Btn>
            <Btn color="coral" disabled={!ready || !online} onClick={() => open("friends")} className="btn-shine flex flex-col items-center gap-1 px-2 py-4">
              <span className="a-bob inline-block text-4xl" style={{ animationDelay: "0.4s" }}>🌍</span>
              <span className="text-base leading-tight">{T.online}</span>
              <span className="text-xs font-bold opacity-90">{T.onlineHint}</span>
            </Btn>
          </div>
        )}
      </main>

      <footer className="relative z-10 flex items-center justify-center gap-4 pb-3 text-sm font-extrabold text-ink-soft">
        <button onClick={() => open("rules")} className="underline decoration-wavy decoration-2 underline-offset-4">📖 {T.rules}</button>
        {installEv && <button onClick={() => { installEv.prompt(); setInstallEv(null); }} className="underline decoration-2 underline-offset-4">📲 {T.installShort}</button>}
      </footer>

      {sheet === "me" && (
        <Sheet title={`👤 ${T.profile}`} onClose={() => setSheet(null)}>
          <div className="flex items-center gap-3">
            <Character avatar={profile.avatar} looks={looks} color={seatColor(0)} size={64} state="happy" />
            <div className="min-w-0 flex-1"><NameInput value={profile.name} onChange={setName} /></div>
          </div>
          <div className="mt-4 text-sm font-black">{T.pickAvatar}</div>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {myHeads.map((a, i) => {
              const on = a === profile.avatar;
              return (
                <button key={a} onClick={() => { setProfile({ ...profile, avatar: a }); sfx("select"); }} aria-pressed={on} aria-label={ITEMS[a]?.name}
                  className={`flex flex-col items-center rounded-2xl border-[2.5px] border-ink px-0.5 pb-1 pt-3 transition-transform ${on ? "-translate-y-1 bg-sun" : "bg-cream"}`}
                  style={{ boxShadow: on ? "0 4px 0 #2b1d14" : "0 2px 0 #2b1d14" }}>
                  <Character avatar={a} color={seatColor(i + 1)} size={44} state={on ? "happy" : "idle"} />
                  <span className="mt-0.5 w-full truncate text-center text-[10px] font-black">{ITEMS[a]?.name}</span>
                </button>
              );
            })}
          </div>
          <Btn color="coral" onClick={() => openShop("hat")} className="mt-4 w-full py-3 text-base">🛍️ {T.moreLooks}</Btn>
        </Sheet>
      )}

      {sheet === "solo" && (
        <Sheet title={`🤖 ${T.withBots}`} onClose={() => setSheet(null)}>
          <div className="text-sm font-black">{T.mode}</div>
          <div className="mt-2"><ModePicker mode={mode} setMode={setMode} /></div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border-[2.5px] border-ink bg-cream px-4 py-2.5">
            <span className="font-black">🤖 {T.bots}</span>
            <Stepper value={soloBots} min={1} max={5} onChange={setSoloBots} label={T.bots} />
          </div>
          <Btn color="sun" onClick={() => { setSheet(null); onSolo(); }} className="mt-4 w-full py-4 text-xl">🔥 {T.start}</Btn>
        </Sheet>
      )}

      {sheet === "friends" && (
        <Sheet title={`🌍 ${T.online}`} onClose={() => setSheet(null)}>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={T.mode}>
            {["any", ...Object.keys(MODE_INFO)].map((k) => {
              const on = quickMode === k;
              return (
                <button key={k} onClick={() => pickQuick(k)} role="radio" aria-checked={on}
                  className={`whitespace-nowrap rounded-full border-[2.5px] border-ink px-3 py-1 text-xs font-black ${on ? "bg-sun" : "bg-cream"}`}
                  style={{ boxShadow: on ? "0 3px 0 #2b1d14" : "0 1px 0 #2b1d14" }}>
                  {k === "any" ? `🎰 ${T.anyMode}` : `${MODE_INFO[k].emoji} ${MODE_INFO[k].name}`}
                </button>
              );
            })}
          </div>
          <Btn color="sun" onClick={() => { setSheet(null); onQuick(quickMode); }} className="mt-2 flex w-full flex-col items-center py-3.5">
            <span className="text-xl leading-tight"><span className="a-hop inline-block">⚡</span> {T.quickPlay}</span>
            <span className="text-xs font-bold opacity-70">{T.quickHint}</span>
          </Btn>

          <div className="mt-4 mb-1.5 text-sm font-black">🌍 {T.openTables}</div>
          <OpenTables onJoin={(c) => { setSheet(null); onJoin(c); }} />

          <div className="my-4 flex items-center gap-3 text-xs font-black text-ink-soft"><span className="h-0.5 flex-1 bg-ink/15" />🔒 {T.privateRoom}<span className="h-0.5 flex-1 bg-ink/15" /></div>
          <Btn color="coral" onClick={() => { setSheet(null); onHost(); }} className="flex w-full items-center justify-center gap-2 py-3 text-lg">🎉 {T.host}</Btn>
          <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">{T.hostHint}</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = cleanCode(code); if (c) { setSheet(null); onJoin(c); } }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={T.joinCode} aria-label={T.joinCode} autoCapitalize="none" spellCheck={false}
              className="comic-sm min-w-0 flex-1 rounded-2xl bg-paper px-4 py-3 font-mono text-lg font-bold lowercase outline-none" />
            <Btn color="mint" type="submit" disabled={!cleanCode(code)}>🔗 {T.join}</Btn>
          </form>
        </Sheet>
      )}

      {sheet === "rules" && (
        <Sheet title={`📖 ${T.rules}`} onClose={() => setSheet(null)}>
          <ol className="list-none space-y-2.5 text-sm leading-relaxed">
            {RULES.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="font-display text-coral">{i + 1}.</span><span>{r}</span></li>
            ))}
          </ol>
        </Sheet>
      )}
    </div>
  );
}
