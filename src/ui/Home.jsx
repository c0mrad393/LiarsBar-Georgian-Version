import { Suspense, lazy, useEffect, useState } from "react";
import { AVATARS, MODE_INFO, RULES, T } from "../i18n.js";
import { ITEMS } from "../shop.js";
import { cleanCode } from "../shared.js";
import { sfx } from "../sfx.js";
import { Card } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
import { Btn, CoinChip, Sheet, SoundToggle, Stepper } from "./parts.jsx";

// Loaded on first open: keeps the first screen light on phones.
const Shop = lazy(() => import("./Shop.jsx"));
const ProfileSheet = lazy(() => import("./Profile.jsx").then((m) => ({ default: m.ProfileSheet })));
const Leaderboard = lazy(() => import("./Profile.jsx").then((m) => ({ default: m.Leaderboard })));

export function ModePicker({ mode, setMode, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(MODE_INFO).map(([k, m]) => {
        const on = mode === k;
        const dark = k === "devil";
        return (
          <button
            key={k}
            disabled={disabled}
            onClick={() => { setMode(k); sfx(dark ? "devil" : "select"); }}
            aria-pressed={on}
            className={`rounded-2xl border-[2.5px] border-ink px-3 py-2.5 text-left transition-transform ${on ? "-translate-y-0.5" : "hover:-translate-y-0.5"} ${dark ? (on ? "bg-[#2a0508] text-white" : "bg-[#f3dada]") : on ? "bg-sun" : "bg-cream"}`}
            style={{ boxShadow: on ? "0 4px 0 #2b1d14" : "0 2px 0 #2b1d14" }}>
            <div className="text-sm font-black"><span className={on ? "a-hop inline-block" : "inline-block"}>{m.emoji}</span> {m.name}</div>
            <div className={`mt-0.5 text-xs font-semibold leading-snug ${dark && on ? "text-white/85" : on ? "text-ink" : "text-ink-soft"}`}>{m.hint}</div>
          </button>
        );
      })}
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

function NameInput({ value, onChange, autoFocus }) {
  return (
    <input
      id="nm"
      value={value}
      maxLength={16}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={T.namePh}
      aria-label={T.yourName}
      className="w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-lg font-bold outline-none focus:bg-white"
    />
  );
}

/** You: your character, name and a way into the wardrobe. First visit asks for a name right here. */
function PlayerCard({ profile, setName, looks, onEdit }) {
  if (!profile.name.trim())
    return (
      <section className="comic a-pop rounded-3xl bg-paper p-4">
        <div className="flex items-center gap-3">
          <Character avatar={profile.avatar} looks={looks} color={seatColor(0)} size={60} state="happy" />
          <div className="min-w-0 flex-1">
            <label htmlFor="nm" className="text-sm font-black">{T.yourName}</label>
            <div className="mt-1"><NameInput value={profile.name} onChange={setName} /></div>
          </div>
        </div>
      </section>
    );
  return (
    <button onClick={onEdit} className="comic a-pop flex w-full items-center gap-4 rounded-3xl bg-paper px-4 py-3 text-left transition-transform active:scale-[0.98]" aria-label={T.editProfile}>
      <Character avatar={profile.avatar} looks={looks} color={seatColor(0)} size={70} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-2xl font-black leading-tight">{profile.name}</div>
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-xs font-bold text-ink-soft">✏️ {T.editProfile}</div>
      </div>
    </button>
  );
}

export default function Home({ profile, setProfile, account, mode, setMode, soloBots, setSoloBots, invite, onSolo, onHost, onJoin, onDropInvite }) {
  const [panel, setPanel] = useState(null); // profile | board | shop (lazy)
  const [sheet, setSheet] = useState(null); // me | solo | friends | rules
  const [shopCat, setShopCat] = useState("hat");
  const openShop = (cat = "hat") => { setSheet(null); setShopCat(cat); setPanel("shop"); };
  const myHeads = [...AVATARS, ...(account.me?.owned || []).filter((id) => ITEMS[id]?.cat === "head")];
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
    <div className="safe-b mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pt-3">
      <div className="safe-t flex items-center justify-between gap-2">
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

      <main className="flex flex-1 flex-col justify-center gap-5 py-5 short:gap-3 short:py-3">
        <div className="a-fade-up"><Logo /></div>

        {!online && <div className="a-pop rounded-2xl border-[2.5px] border-ink bg-cream px-4 py-2 text-center text-xs font-black">📴 {T.offlineNow}</div>}

        {invite && (
          <div className="a-pop comic rounded-3xl bg-sun px-5 py-3 text-center">
            <div className="text-xl font-black">{T.invited}</div>
            <div className="mt-1 inline-block rounded-full border-2 border-ink bg-paper px-3 py-0.5 font-mono text-sm font-bold">{T.roomCode}: {invite}</div>
          </div>
        )}

        <PlayerCard profile={profile} setName={setName} looks={looks} onEdit={() => open("me")} />

        {invite ? (
          <div className="flex flex-col gap-2">
            <Btn color="coral" disabled={!ready || !online} onClick={() => onJoin(invite)} className="py-4 text-xl">🍻 {T.join}</Btn>
            <button onClick={onDropInvite} className="py-1 text-sm font-bold text-ink-soft underline decoration-2 underline-offset-4">{T.menu}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Btn color="sun" disabled={!ready} onClick={() => open("solo")} className="flex flex-col items-center gap-1 px-2 py-4">
              <span className="a-bob inline-block text-4xl">🤖</span>
              <span className="text-base leading-tight">{T.withBots}</span>
              <span className="text-xs font-bold opacity-70">{soloBots + 1} {T.players} · {MODE_INFO[mode].emoji}</span>
            </Btn>
            <Btn color="coral" disabled={!ready || !online} onClick={() => open("friends")} className="flex flex-col items-center gap-1 px-2 py-4">
              <span className="a-bob inline-block text-4xl" style={{ animationDelay: "0.4s" }}>🎉</span>
              <span className="text-base leading-tight">{T.withFriends}</span>
              <span className="text-xs font-bold opacity-90">{T.withFriendsHint}</span>
            </Btn>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-center gap-4 pb-3 text-sm font-extrabold text-ink-soft">
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
          <div className="mt-2 grid grid-cols-6 gap-2">
            {myHeads.map((a) => {
              const on = a === profile.avatar;
              return (
                <button key={a} onClick={() => { setProfile({ ...profile, avatar: a }); sfx("select"); }} aria-pressed={on}
                  className={`flex aspect-square items-center justify-center rounded-2xl border-[2.5px] border-ink text-2xl ${on ? "a-hop bg-sun" : "bg-cream"}`}
                  style={{ boxShadow: on ? "0 3px 0 #2b1d14" : "0 2px 0 #2b1d14" }}>
                  {a}
                </button>
              );
            })}
          </div>
          <Btn color="coral" onClick={() => openShop("head")} className="mt-4 w-full py-3 text-base">🛍️ {T.moreLooks}</Btn>
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
        <Sheet title={`🎉 ${T.withFriends}`} onClose={() => setSheet(null)}>
          <Btn color="coral" onClick={() => { setSheet(null); onHost(); }} className="flex w-full items-center justify-center gap-2 py-4 text-lg">🎉 {T.host}</Btn>
          <p className="mt-1.5 text-center text-xs font-bold text-ink-soft">{T.hostHint}</p>
          <div className="my-4 flex items-center gap-3 text-xs font-black text-ink-soft"><span className="h-0.5 flex-1 bg-ink/15" />{T.or}<span className="h-0.5 flex-1 bg-ink/15" /></div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = cleanCode(code); if (c) { setSheet(null); onJoin(c); } }}>
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
