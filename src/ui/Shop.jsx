// The shop: a fitting room at the top (your character wearing what you
// equipped plus whatever you're trying on), category tabs, and a grid of items.
import { useEffect, useMemo, useState } from "react";
import { T } from "../i18n.js";
import { BY_CAT, CATS, ITEMS, RARITY, owns } from "../shop.js";
import { sfx } from "../sfx.js";
import { CardBack } from "./cards.jsx";
import Character, { seatColor } from "./Character.jsx";
import { Btn, Confetti } from "./parts.jsx";

const slotOfCat = (cat) => CATS.find((c) => c.id === cat)?.slot;

function Preview({ item, size = 50 }) {
  if (item.cat === "head") return <span style={{ fontSize: size * 0.72 }}>{item.id}</span>;
  if (item.cat === "throw") return <span style={{ fontSize: size * 0.62 }}>{item.id}</span>;
  if (item.cat === "cards") return <CardBack size="sm" back={item.back} />;
  if (item.cat === "felt") {
    const [a, b, c] = item.felt;
    return <span className="block rounded-[50%] border-[3px] border-[#c07d3f]" style={{ width: size, height: size * 0.62, background: `radial-gradient(circle at 50% 40%, ${a}, ${b} 55%, ${c})`, boxShadow: "0 0 0 2px #2b1d14" }} />;
  }
  return <Character avatar="🙂" looks={{ [slotOfCat(item.cat)]: item.id }} color="#cfd6e3" size={size} />;
}

function ItemCard({ item, owned, equipped, selected, onClick }) {
  const rar = RARITY[item.r];
  return (
    <button onClick={onClick}
      className={`relative flex flex-col items-center rounded-2xl border-[2.5px] bg-paper px-1 pb-1.5 pt-2 transition-transform active:scale-95 ${selected ? "-translate-y-1" : ""}`}
      style={{ borderColor: selected ? "#2b1d14" : rar.color, boxShadow: selected ? `0 0 0 3px ${rar.color}, 0 4px 0 #2b1d14` : "0 2px 0 #2b1d1440" }}
      aria-pressed={selected} aria-label={item.name}>
      {equipped && <span className="absolute -right-1.5 -top-1.5 z-10 rounded-full border-2 border-ink bg-mint px-1 text-[10px] font-black text-white">✓</span>}
      <div className="flex h-[62px] items-end justify-center">
        <Preview item={item} />
      </div>
      <div className="mt-1 line-clamp-1 w-full text-center text-[10px] font-black leading-tight">{item.name}</div>
      <div className="mt-0.5 text-[10px] font-black" style={{ color: owned ? "#159f92" : rar.color }}>
        {item.price === 0 ? T.free : owned ? `✓ ${T.owned}` : `🪙 ${item.price}`}
      </div>
    </button>
  );
}

/**
 * @param account from useAccount: { me, buy, equip }
 * @param profile { name, avatar }, setProfile to switch heads locally too
 */
export default function Shop({ account, profile, setProfile, onClose, startCat = "hat" }) {
  const { me } = account;
  const [cat, setCat] = useState(startCat);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [party, setParty] = useState(0);
  const [mood, setMood] = useState("idle");
  const [hit, setHit] = useState(null);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const owned = me?.owned || [];
  const looks = me?.looks || {};
  const item = sel ? ITEMS[sel] : null;
  const slot = item ? slotOfCat(item.cat) : null;
  const isOwned = item ? owns(owned, item.id) : false;
  const isEquipped = item ? (item.cat === "head" ? profile.avatar === item.id : looks[slot] === item.id) : false;

  // The fitting room shows the selected item on top of what's equipped.
  const tryLooks = item && slot && slot !== "avatar" ? { ...looks, [slot]: item.id } : looks;
  const tryHead = item?.cat === "head" ? item.id : profile.avatar;

  const list = useMemo(() => {
    const all = BY_CAT[cat] || [];
    if (filter === "mine") return all.filter((i) => owns(owned, i.id));
    return [...all].sort((a, b) => a.price - b.price);
  }, [cat, filter, owned]);

  const pick = (id) => {
    setSel(id);
    setConfirm(false);
    setMsg(null);
    sfx("select");
    const it = ITEMS[id];
    if (it.cat === "throw") { setHit({ item: id, key: Date.now() }); setTimeout(() => sfx(id === "💐" ? "joker" : "splat"), 100); }
  };

  const wear = async () => {
    if (!item || busy) return;
    setBusy(true);
    try {
      if (item.cat === "head") {
        await account.equip(looks, item.id);
        setProfile({ ...profile, avatar: item.id });
      } else if (slot) {
        await account.equip(isEquipped ? { ...looks, [slot]: undefined } : { ...looks, [slot]: item.id });
      }
      sfx(isEquipped ? "pop" : "join");
      setMood("happy");
      setTimeout(() => setMood("idle"), 1500);
    } catch {
      setMsg(T.shopOffline);
    }
    setBusy(false);
  };

  const buy = async () => {
    if (!item || busy) return;
    if (!confirm) { setConfirm(true); sfx("select"); return; }
    setBusy(true);
    try {
      const r = await account.buy(item.id);
      if (r.ok) {
        sfx("win");
        setParty(Date.now());
        setMood("win");
        setTimeout(() => setMood("idle"), 2200);
        setMsg(T.bought);
        // Put it on right away (heads and throwables need no equipping).
        if (slot && slot !== "avatar") await account.equip({ ...(r.profile?.looks || looks), [slot]: item.id });
      } else {
        setMsg(r.error === "poor" ? T.poor : r.error === "owned" ? T.owned : T.shopOffline);
        sfx("bluff");
      }
    } catch {
      setMsg(T.shopOffline);
    }
    setConfirm(false);
    setBusy(false);
  };

  const coins = me?.coins ?? 0;
  const poor = item && !isOwned && item.price > coins;

  return (
    <div className="a-fade-up fixed inset-0 z-[85] flex items-end justify-center bg-ink/45 backdrop-blur-[3px] sm:items-center sm:px-4" onClick={onClose}>
      {party ? <Confetti key={party} count={70} /> : null}
      <div className="a-sheet comic safe-b flex h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-paper sm:h-[88dvh] sm:rounded-[2rem]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={T.shop}>
        {/* header + fitting room */}
        <div className="relative shrink-0 border-b-[3px] border-ink bg-sun/70 px-4 pb-2 pt-3" style={{ backgroundImage: "radial-gradient(#2b1d1414 1.5px, transparent 1.5px)", backgroundSize: "16px 16px" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">🛍️ {T.shop}</h2>
            <div className="flex items-center gap-2">
              <span className="comic-sm flex h-9 items-center gap-1 rounded-full bg-paper px-3 text-sm font-black tabular-nums"><span className="a-bob inline-block">🪙</span>{coins}</span>
              <button onClick={onClose} className="comic-sm flex h-9 w-9 items-center justify-center rounded-full bg-paper font-black" aria-label={T.close}>✕</button>
            </div>
          </div>
          <div className="mt-1 flex items-end justify-center gap-4">
            <div className="flex min-h-[150px] items-end justify-center pt-10">
              <Character avatar={tryHead} looks={tryLooks} color={seatColor(0)} size={96} state={mood} hit={hit?.item} hitKey={hit?.key} hitDelay={0} />
            </div>
            {item && (item.cat === "cards" || item.cat === "felt") && (
              <div className="a-pop mb-4"><Preview item={item} size={90} /></div>
            )}
          </div>
        </div>

        {/* categories */}
        <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b-2 border-ink/10 px-3 py-2">
          {CATS.map((c) => (
            <button key={c.id} onClick={() => { setCat(c.id); setSel(null); setConfirm(false); sfx("select"); }}
              className={`flex shrink-0 items-center gap-1 rounded-full border-[2.5px] border-ink px-3 py-1.5 text-xs font-black ${cat === c.id ? "bg-sun" : "bg-cream"}`}
              style={{ boxShadow: cat === c.id ? "0 3px 0 #2b1d14" : "none" }} aria-pressed={cat === c.id}>
              <span className="text-base leading-none">{c.icon}</span>{c.name}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1.5 px-3 pt-2">
          {[["all", T.all], ["mine", T.mine]].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-full border-2 border-ink px-2.5 text-[11px] font-black ${filter === k ? "bg-ink text-white" : "bg-paper"}`}>{label}</button>
          ))}
          <span className="ml-auto self-center text-[10px] font-bold text-ink-soft">{list.length}</span>
        </div>

        {/* grid */}
        <div className="no-scrollbar grid flex-1 auto-rows-min grid-cols-3 gap-2 overflow-y-auto px-3 pb-3 pt-2 sm:grid-cols-5">
          {!me && <p className="col-span-full py-6 text-center text-sm font-bold">{T.shopOffline}</p>}
          {me && list.map((i) => (
            <ItemCard key={i.id} item={i} owned={owns(owned, i.id)} selected={sel === i.id}
              equipped={i.cat === "head" ? profile.avatar === i.id : looks[slotOfCat(i.cat)] === i.id}
              onClick={() => pick(i.id)} />
          ))}
        </div>

        {/* action bar */}
        {item && me && (
          <div className="a-sheet flex shrink-0 items-center gap-3 border-t-[3px] border-ink bg-cream px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{item.name}</div>
              <div className="text-[11px] font-black" style={{ color: RARITY[item.r].color }}>
                {RARITY[item.r].name}{msg ? <span className="ml-2 text-ink">{msg}</span> : null}
              </div>
            </div>
            {item.cat === "throw" ? (
              isOwned ? <span className="text-xs font-black text-mint-deep">✓ {T.throwOwned}</span> : (
                <Btn color={confirm ? "coral" : "sun"} disabled={poor || busy} onClick={buy} className="whitespace-nowrap px-4 py-2.5 text-sm">
                  {poor ? T.poor : confirm ? `${T.confirmBuy} 🪙${item.price}` : `${T.buy} 🪙${item.price}`}
                </Btn>
              )
            ) : isOwned ? (
              <Btn color={isEquipped ? "paper" : "mint"} disabled={busy || (isEquipped && item.cat === "head")} onClick={wear} className="whitespace-nowrap px-4 py-2.5 text-sm">
                {item.cat === "head" ? (isEquipped ? `✓ ${T.current}` : T.useAvatar) : isEquipped ? T.unequip : T.equip}
              </Btn>
            ) : (
              <Btn color={confirm ? "coral" : "sun"} disabled={poor || busy} onClick={buy} className="whitespace-nowrap px-4 py-2.5 text-sm">
                {poor ? T.poor : confirm ? `${T.confirmBuy} 🪙${item.price}` : `${T.buy} 🪙${item.price}`}
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
