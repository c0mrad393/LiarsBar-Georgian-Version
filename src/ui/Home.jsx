import { useEffect, useState } from "react";
import { AVATARS, MODE_INFO, RULES, T } from "../i18n.js";
import { cleanCode } from "../shared.js";
import { sfx } from "../sfx.js";
import { Card } from "./cards.jsx";
import { Btn, SoundToggle, Stepper } from "./parts.jsx";
import { CoinChip, Leaderboard, ProfileSheet } from "./Profile.jsx";

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
            className={`rounded-2xl border-[2.5px] border-ink px-3 py-2.5 text-left transition-transform ${on ? "-translate-y-0.5" : "opacity-70 hover:opacity-100"} ${dark ? (on ? "bg-[#2a0508] text-white" : "bg-[#f3dada]") : on ? "bg-sun" : "bg-cream"}`}
            style={{ boxShadow: on ? "0 4px 0 #2b1d14" : "0 2px 0 #2b1d14" }}>
            <div className="text-sm font-black"><span className={on ? "a-hop inline-block" : "inline-block"}>{m.emoji}</span> {m.name}</div>
            <div className={`mt-0.5 text-[10px] font-semibold leading-snug ${dark && on ? "text-white/80" : "text-ink-soft"}`}>{m.hint}</div>
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
        <div className="relative mb-2 h-28 w-48">
          {[["A", "S"], ["J"], ["K", "H"]].map(([r, suit], i) => (
            <div
              key={r}
              className="a-deal absolute left-1/2 top-2"
              style={{ animationDelay: `${i * 120}ms`, marginLeft: -31 + (i - 1) * 34 }}>
              <div style={{ transform: `rotate(${(i - 1) * 16}deg) translateY(${Math.abs(i - 1) * 8}px)` }}>
                <Card rank={r} suit={suit} size="md" />
              </div>
            </div>
          ))}
        </div>
      )}
      <h1 className={`font-black tracking-tight text-ink ${small ? "text-xl" : "text-4xl sm:text-6xl"}`} style={{ textShadow: small ? "none" : "3px 3px 0 #ffc83d" }}>
        {T.title}
      </h1>
      {!small && <p className="mt-2 font-display text-lg tracking-wide text-coral sm:text-xl">{T.tagline}</p>}
    </div>
  );
}

export default function Home({ profile, setProfile, account, mode, setMode, soloBots, setSoloBots, invite, onSolo, onHost, onJoin, onDropInvite }) {
  const [panel, setPanel] = useState(null); // profile | board
  const [code, setCode] = useState(invite || "");
  const [rules, setRules] = useState(false);
  // Android/Chrome offers "install" (fullscreen app on the home screen) via this event.
  const [installEv, setInstallEv] = useState(null);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEv(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  const setName = (name) => setProfile({ ...profile, name });
  const ready = profile.name.trim().length > 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-10 pt-4">
      <div className="flex items-center justify-between gap-2">
        <CoinChip coins={account.me?.coins ?? (account.error ? "—" : 0)} onClick={() => setPanel("profile")} className={account.me?.dailyReady ? "a-hop" : ""} />
        <div className="flex items-center gap-2">
          <button onClick={() => setPanel("board")} className="comic-sm flex h-10 items-center gap-1 rounded-full bg-paper px-3 text-sm font-black" aria-label={T.leaderboard}>🏆<span className="hidden sm:inline">{T.leaderboard}</span></button>
          <SoundToggle />
        </div>
      </div>
      {panel === "profile" && <ProfileSheet account={account} profile={profile} setProfile={setProfile} onClose={() => setPanel(null)} />}
      {panel === "board" && <Leaderboard onClose={() => setPanel(null)} />}
      <div className="a-fade-up mt-2"><Logo /></div>

      {invite && (
        <div className="a-pop comic mt-6 rounded-3xl bg-sun px-5 py-4 text-center">
          <div className="text-2xl font-black">{T.invited}</div>
          <div className="mt-1 text-sm font-semibold text-ink-soft">{T.invitedHint}</div>
          <div className="mt-2 inline-block rounded-full border-2 border-ink bg-paper px-3 py-0.5 font-mono text-sm font-bold">{T.roomCode}: {invite}</div>
        </div>
      )}

      <section className="comic a-fade-up mt-6 rounded-3xl bg-paper p-5" style={{ animationDelay: "80ms" }}>
        <label className="text-sm font-extrabold" htmlFor="nm">{T.yourName}</label>
        <input
          id="nm"
          value={profile.name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder={T.namePh}
          className="mt-1.5 w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 text-lg font-bold outline-none focus:bg-white"
        />
        <div className="mt-4 text-sm font-extrabold">{T.pickAvatar}</div>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => {
            const on = a === profile.avatar;
            return (
              <button
                key={a}
                onClick={() => { setProfile({ ...profile, avatar: a }); sfx("select"); }}
                className={`flex aspect-square items-center justify-center rounded-2xl border-[2.5px] border-ink text-2xl transition-transform sm:text-3xl ${on ? "a-hop bg-sun" : "bg-cream hover:-translate-y-0.5"}`}
                style={{ boxShadow: on ? "0 4px 0 #2b1d14" : "0 2px 0 #2b1d14" }}
                aria-pressed={on}>
                {a}
              </button>
            );
          })}
        </div>
      </section>

      {!invite && (
        <section className="a-fade-up mt-5" style={{ animationDelay: "120ms" }}>
          <div className="mb-2 text-sm font-extrabold">{T.mode}</div>
          <ModePicker mode={mode} setMode={setMode} />
        </section>
      )}

      <div className="a-fade-up mt-6 flex flex-col gap-3" style={{ animationDelay: "160ms" }}>
        {invite ? (
          <>
            <Btn color="coral" disabled={!ready} onClick={() => onJoin(invite)} className="py-4 text-xl">🍻 {T.join}</Btn>
            <button onClick={onDropInvite} className="mt-1 text-sm font-bold text-ink-soft underline decoration-2 underline-offset-4">{T.menu}</button>
          </>
        ) : (
          <>
            <div className="flex items-stretch gap-2">
              <Btn color="sun" disabled={!ready} onClick={onSolo} className="flex flex-1 items-center gap-3 py-4 text-left">
                <span className="text-3xl">🤖</span>
                <span><span className="block text-lg">{T.solo}</span><span className="block text-xs font-semibold opacity-70">{soloBots + 1} {T.players}</span></span>
              </Btn>
              <div className="comic-sm flex flex-col items-center justify-center rounded-2xl bg-paper px-2">
                <span className="text-[10px] font-extrabold text-ink-soft">{T.bots}</span>
                <Stepper value={soloBots} min={1} max={5} onChange={setSoloBots} label={T.bots} />
              </div>
            </div>
            <Btn color="coral" disabled={!ready} onClick={onHost} className="flex items-center gap-3 py-4 text-left">
              <span className="text-3xl">🎉</span>
              <span><span className="block text-lg">{T.host}</span><span className="block text-xs font-semibold opacity-85">{T.hostHint}</span></span>
            </Btn>
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); const c = cleanCode(code); if (c && ready) onJoin(c); }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={T.joinCode}
                aria-label={T.joinCode}
                className="comic-sm min-w-0 flex-1 rounded-2xl bg-paper px-4 py-3 font-mono text-lg font-bold lowercase outline-none"
              />
              <Btn color="mint" type="submit" disabled={!ready || !cleanCode(code)}>🔗 {T.join}</Btn>
            </form>
          </>
        )}
      </div>

      {installEv && (
        <Btn color="mint" onClick={() => { installEv.prompt(); setInstallEv(null); }} className="mt-6 self-center px-5 py-2.5 text-sm">{T.install}</Btn>
      )}

      <button onClick={() => setRules(!rules)} className="mt-8 self-center text-sm font-extrabold text-ink-soft underline decoration-wavy decoration-2 underline-offset-4">
        📖 {T.rules}
      </button>
      {rules && (
        <ol className="a-pop comic mt-3 list-none space-y-2 rounded-3xl bg-paper p-5 text-sm leading-relaxed">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-2"><span className="font-display text-coral">{i + 1}.</span><span>{r}</span></li>
          ))}
        </ol>
      )}
    </div>
  );
}
