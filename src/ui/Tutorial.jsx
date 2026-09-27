// The tamada teaches your first game against the bots in three short steps,
// each shown at the moment it's needed. Once per game kind (cards / dice).
import { useEffect, useState } from "react";
import { RANKS, T } from "../i18n.js";
import { sfx } from "../sfx.js";
import Character from "./Character.jsx";

const TAMADA_LOOKS = { mouth: "m_curly", outfit: "o_chokha", hand: "h_wine" };
const key = (kind) => `lb-tut-${kind}`;

function doneBefore(kind) {
  try { return localStorage.getItem(key(kind)) === "done"; } catch { return true; }
}

/** Which tutorial line to show now, or null. */
export function useTutorial(view, solo) {
  const kind = view.kind === "dice" ? "dice" : "cards";
  const [step, setStep] = useState(() => (solo && !doneBefore(kind) ? 0 : -1));
  const me = view.me;
  const myTurn = view.phase === "playing" && view.turn === me && view.seats[me]?.alive;
  const answering = myTurn && (kind === "dice" ? view.bid && view.bid.by !== me : view.pile && view.pile.by !== me);
  const iActed = view.log.some((e) => (e.type === "play" || e.type === "bid") && e.seat === me);

  const finish = () => {
    try { localStorage.setItem(key(kind), "done"); } catch { /* private mode */ }
    setStep(-1);
  };
  // Step 1 ("make your move") goes away by itself once you have.
  useEffect(() => { if (step === 1 && iActed) setStep(2); }, [step, iActed]);

  let text = null;
  if (step === 0 && myTurn) {
    text = kind === "dice"
      ? T.tut.dice0
      : T.tut.cards0.replace("{card}", `${RANKS[view.tableCard]?.emoji} ${RANKS[view.tableCard]?.geo}`);
  } else if (step === 1 && myTurn && !iActed) {
    text = kind === "dice" ? T.tut.dice1 : T.tut.cards1;
  } else if (step === 2 && answering) {
    text = kind === "dice" ? T.tut.dice2 : T.tut.cards2;
  }
  const next = () => { sfx("pop"); if (step >= 2) finish(); else setStep(step + 1); };
  return { text, step, next, skip: finish };
}

/** The tamada's speech bubble, above your hand. */
export function TamadaTip({ text, step, onNext, onSkip }) {
  return (
    <div className="a-pop pointer-events-none fixed inset-x-2 bottom-[262px] z-[58] mx-auto flex max-w-md items-end gap-1 short:bottom-[214px]">
      <div className="shrink-0 drop-shadow-lg"><Character avatar="av_khinkali" looks={TAMADA_LOOKS} color="#7a2c54" size={70} state="talk" /></div>
      <div className="speech pointer-events-auto mb-6 flex-1 rounded-2xl px-3 py-2 text-left text-[13px] font-bold leading-snug">
        <div className="font-sign text-xs font-black text-coral">🍷 {T.tut.name}</div>
        <div>{text}</div>
        <div className="mt-1.5 flex items-center justify-between">
          <button onClick={onSkip} className="text-[11px] font-bold text-ink-soft underline">{T.tut.skip}</button>
          {step !== 1 && (
            <button onClick={onNext} className="rounded-full border-2 border-ink bg-sun px-3 py-0.5 text-xs font-black">{T.tut.ok}</button>
          )}
        </div>
      </div>
    </div>
  );
}
