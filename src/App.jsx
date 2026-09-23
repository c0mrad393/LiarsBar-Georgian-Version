import { useEffect, useState } from "react";
import { AVATARS, T } from "./i18n.js";
import { cleanCode } from "./net.js";
import { cleanAvatar, cleanName, useGuest, useHost, useSolo } from "./useGame.js";
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

function SoloScreen({ profile, onLeave }) {
  const g = useSolo(profile);
  if (!g.view) return null;
  return <Game view={g.view} act={g.act} emotes={g.emotes} sendEmote={g.sendEmote} canRestart onAgain={g.again} onLeave={onLeave} />;
}

function HostScreen({ profile, onLeave }) {
  const h = useHost(profile);
  const leave = () => { if (h.status !== "game" || window.confirm("თამაში ყველასთვის დასრულდება. გავიდე?")) onLeave(); };
  if (h.status === "creating") return <Notice emoji="🔨" title={T.creating} />;
  if (h.status === "error")
    return (
      <Notice emoji="😵" title={T[h.error] || T.netError}>
        <Btn color="paper" onClick={onLeave}>{T.back}</Btn>
      </Notice>
    );
  if (h.status === "lobby" || !h.view)
    return <Lobby lobby={h.lobby} isHost setBotFill={h.setBotFill} canStart={h.canStart} onStart={h.start} onLeave={onLeave} />;
  return <Game view={h.view} act={h.act} emotes={h.emotes} sendEmote={h.sendEmote} canRestart onAgain={h.again} onLeave={leave} onToLobby={h.toLobby} />;
}

function GuestScreen({ code, profile, onLeave, onRetry }) {
  const g = useGuest(code, profile);
  if (g.status === "connecting") return <Notice emoji="📡" title={T.connecting} />;
  if (g.status === "error" || g.status === "closed")
    return (
      <Notice emoji={g.status === "closed" ? "😢" : "😵"} title={g.status === "closed" ? T.hostLeft : T[g.error] || T.netError}>
        {g.error !== "roomFull" && g.error !== "alreadyStarted" && <Btn color="sun" onClick={onRetry}>🔄 თავიდან ცდა</Btn>}
        <Btn color="paper" onClick={onLeave}>🏠 {T.menu}</Btn>
      </Notice>
    );
  if (g.status === "lobby" || !g.view) return <Lobby lobby={g.lobby} onLeave={onLeave} />;
  return <Game view={g.view} act={g.act} emotes={g.emotes} sendEmote={g.sendEmote} canRestart={false} onLeave={onLeave} />;
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile);
  const [invite, setInvite] = useState(roomFromUrl);
  const [screen, setScreen] = useState({ name: "home" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    try { localStorage.setItem("lb-profile", JSON.stringify(profile)); } catch { /* private mode */ }
  }, [profile]);

  const clean = { name: cleanName(profile.name), avatar: cleanAvatar(profile.avatar) };
  const home = () => { setScreen({ name: "home" }); setInvite(""); setRoomInUrl(null); };

  if (screen.name === "solo") return <SoloScreen profile={clean} onLeave={home} />;
  if (screen.name === "host") return <HostScreen profile={clean} onLeave={home} />;
  if (screen.name === "guest")
    return <GuestScreen key={`${screen.code}-${attempt}`} code={screen.code} profile={clean} onLeave={home} onRetry={() => setAttempt((a) => a + 1)} />;

  return (
    <Home
      profile={profile}
      setProfile={setProfile}
      invite={invite}
      onSolo={() => setScreen({ name: "solo" })}
      onHost={() => setScreen({ name: "host" })}
      onJoin={(code) => { setRoomInUrl(code); setScreen({ name: "guest", code }); }}
      onDropInvite={home}
    />
  );
}
