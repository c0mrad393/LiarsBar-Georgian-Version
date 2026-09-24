import { useEffect, useState } from "react";
import { AVATARS, T } from "./i18n.js";
import { requestTilt } from "./device.js";
import { makeCode, useOnline } from "./online.js";
import { cleanAvatar, cleanCode, cleanName } from "./shared.js";
import { useSolo } from "./useGame.js";
import Game from "./ui/Game.jsx";
import Home, { Logo } from "./ui/Home.jsx";
import Lobby from "./ui/Lobby.jsx";
import { Btn } from "./ui/parts.jsx";

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem("lb-profile") || "{}");
    return { name: typeof p.name === "string" ? p.name.slice(0, 16) : "", avatar: cleanAvatar(p.avatar || AVATARS[(Math.random() * AVATARS.length) | 0]) };
  } catch {
    return { name: "", avatar: AVATARS[0] };
  }
}

const roomFromUrl = () => cleanCode(new URLSearchParams(window.location.search).get("room"));

function setRoomInUrl(code) {
  const u = new URL(window.location.href);
  if (code) u.searchParams.set("room", code);
  else u.searchParams.delete("room");
  window.history.replaceState(null, "", u);
}

function Notice({ emoji = "🍺", title, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <Logo small />
      <div className="a-pop comic mt-6 w-full rounded-3xl bg-paper p-6">
        <div className="a-wiggle inline-block text-5xl">{emoji}</div>
        <div className="mt-2 text-lg font-black">{title}</div>
        <div className="mt-4 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

function SoloScreen({ profile, mode, bots, onLeave }) {
  const g = useSolo(profile, mode, bots);
  if (!g.view) return null;
  return <Game view={g.view} act={g.act} fx={g.fx} emote={g.emote} throwAt={g.throwAt} say={g.say} canRestart onAgain={g.again} onLeave={onLeave} />;
}

function OnlineScreen({ code, create, profile, mode, setMode, onLeave, onRetry }) {
  const o = useOnline({ code, create, profile, mode, onCode: setRoomInUrl });
  const pickMode = (m) => { o.ctl("mode", m); setMode(m); };
  const leave = () => { if (o.status !== "game" || o.view?.phase === "gameover" || window.confirm(T.leaveGameConfirm)) onLeave(); };

  if (o.status === "connecting") return <Notice emoji="📡" title={create ? T.creating : T.connecting} />;
  if (o.status === "error")
    return (
      <Notice emoji="😵" title={T[o.error] || T.netError}>
        {!["roomFull", "alreadyStarted", "roomMissing"].includes(o.error) && <Btn color="sun" onClick={onRetry}>🔄 {T.retry}</Btn>}
        <Btn color="paper" onClick={onLeave}>🏠 {T.menu}</Btn>
      </Notice>
    );
  const banner = o.status === "reconnecting" && (
    <div className="a-pop fixed left-1/2 top-3 z-[95] -translate-x-1/2 rounded-full border-[2.5px] border-ink bg-sun px-4 py-1.5 text-sm font-black" style={{ boxShadow: "0 3px 0 #2b1d14" }}>
      <span className="a-wiggle inline-block">📡</span> {T.reconnecting}
    </div>
  );
  if (!o.view)
    return (
      <>
        {banner}
        {o.lobby ? (
          <Lobby lobby={o.lobby} isHost={o.isHost} setBots={(v) => o.ctl("bots", v)} setMode={pickMode} onStart={() => o.ctl("start")} onLeave={onLeave} />
        ) : (
          <Notice emoji="📡" title={T.connecting} />
        )}
      </>
    );
  return (
    <>
      {banner}
      <Game
        view={o.view}
        act={o.act}
        fx={o.fx}
        emote={o.emote}
        throwAt={o.throwAt}
        say={o.say}
        canRestart={o.isHost}
        onAgain={() => o.ctl("again")}
        onLeave={leave}
        onToLobby={o.isHost ? () => o.ctl("toLobby") : undefined}
      />
    </>
  );
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [invite, setInvite] = useState(roomFromUrl);
  const [screen, setScreen] = useState({ name: "home" });
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("lb-mode") === "devil" ? "devil" : "classic"; } catch { return "classic"; }
  });
  useEffect(() => {
    try { localStorage.setItem("lb-mode", mode); } catch { /* private mode */ }
  }, [mode]);
  const [soloBots, setSoloBots] = useState(() => {
    try { return Math.min(5, Math.max(1, Number(localStorage.getItem("lb-bots")) || 3)); } catch { return 3; }
  });
  useEffect(() => {
    try { localStorage.setItem("lb-bots", String(soloBots)); } catch { /* private mode */ }
  }, [soloBots]);

  useEffect(() => {
    try { localStorage.setItem("lb-profile", JSON.stringify(profile)); } catch { /* private mode */ }
  }, [profile]);

  const clean = { name: cleanName(profile.name), avatar: cleanAvatar(profile.avatar) };
  const home = () => { setScreen({ name: "home" }); setInvite(""); setRoomInUrl(null); };

  if (screen.name === "solo") return <SoloScreen profile={clean} mode={mode} bots={soloBots} onLeave={home} />;
  if (screen.name === "online")
    return (
      <OnlineScreen
        key={`${screen.code}-${attempt}`}
        code={screen.code}
        create={screen.create && attempt === 0}
        profile={clean}
        mode={mode}
        setMode={setMode}
        onLeave={home}
        onRetry={() => setAttempt((a) => a + 1)}
      />
    );

  return (
    <Home
      profile={profile}
      setProfile={setProfile}
      mode={mode}
      setMode={setMode}
      soloBots={soloBots}
      setSoloBots={setSoloBots}
      invite={invite}
      onSolo={() => { requestTilt(); setScreen({ name: "solo" }); }}
      onHost={() => { requestTilt(); const code = makeCode(); setRoomInUrl(code); setAttempt(0); setScreen({ name: "online", code, create: true }); }}
      onJoin={(code) => { requestTilt(); setRoomInUrl(code); setAttempt(0); setScreen({ name: "online", code, create: false }); }}
      onDropInvite={home}
    />
  );
}
