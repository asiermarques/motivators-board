import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import Markdown from "react-markdown";
import type { Fulfilment, Motivator } from "../model";
import FulfilmentMark from "./FulfilmentMark";

interface Props {
  motivator: Motivator;
  /** The Position of the Card on the Board, 0-based from the least important. */
  position: number;
  /** Where the Card sits sideways: to the right when Met, to the left when Unmet, in the centre without one. */
  fulfilment: Fulfilment | undefined;
  /** The Fulfilment its mark shows: its own, or while it is dragged, the one it would settle in if dropped now. */
  marked: Fulfilment | undefined;
  /** Id of the element that tells keyboard users how to move a Card. */
  instructionsId: string;
  /** A Move asked from the keyboard: one Position less or more important, or to either end. */
  onKeyboardMove: (key: string, where: "previous" | "next" | "first" | "last") => void;
  /** A Fulfilment change asked from the keyboard: one place to the left (towards Unmet) or to the right (towards Met). */
  onKeyboardStep: (key: string, direction: "left" | "right") => void;
}

const MOVES: Record<string, "previous" | "next" | "first" | "last"> = {
  // Up makes a Card more important, down less.
  ArrowDown: "previous",
  ArrowUp: "next",
  Home: "first",
  End: "last",
};

const STEPS: Record<string, "left" | "right"> = { ArrowLeft: "left", ArrowRight: "right" };

/** A small, stable irregularity for each Motivator, so the Cards look laid by hand: -1 to 1 (scaled in styles.css). */
function tilt(key: string): number {
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 5) - 2) / 2;
}

/** The Card of one Motivator: its icon on its colour and its Title; flipped, its Description. */
export default function MotivatorCard({ motivator, position, fulfilment, marked, instructionsId, onKeyboardMove, onKeyboardStep }: Props) {
  const [flipped, setFlipped] = useState(false);
  /** Where the Card was dealt: its place in the opening deal, which later Moves do not change. */
  const [dealtAt] = useState(position);
  const descriptionId = useId();
  const markId = useId();
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: motivator.key });

  function onKeyDown(event: KeyboardEvent) {
    const where = MOVES[event.key];
    const direction = STEPS[event.key];
    if (where) onKeyboardMove(motivator.key, where);
    else if (direction) onKeyboardStep(motivator.key, direction);
    else return;
    event.preventDefault();
  }

  const style = {
    "--motivator-colour": motivator.colour,
    "--deal": dealtAt,
    "--tilt": tilt(motivator.key),
    transform: CSS.Translate.toString(transform),
    transition,
  } as CSSProperties;

  return (
    <li
      ref={setNodeRef}
      className="card"
      style={style}
      data-key={motivator.key}
      data-fulfilment={fulfilment}
      data-flipped={flipped || undefined}
      data-dragging={isDragging || undefined}
    >
      <div className="card-inner">
        <button
          type="button"
          className="card-face"
          data-motivator={motivator.key}
          aria-expanded={flipped}
          aria-controls={descriptionId}
          aria-describedby={marked ? `${markId} ${instructionsId}` : instructionsId}
          {...listeners}
          onKeyDown={onKeyDown}
          onClick={() => setFlipped((value) => !value)}
        >
          <span className="card-icon">
            <img src={motivator.icon} alt="" draggable={false} />
          </span>
          <span className="card-title">{motivator.title}</span>
        </button>
        {/* Keyed by the Fulfilment, so the mark is stamped again each time it changes. */}
        {marked && <FulfilmentMark key={marked} fulfilment={marked} id={markId} />}
        <div className="card-description" id={descriptionId} hidden={!flipped}>
          <Markdown>{motivator.description}</Markdown>
        </div>
      </div>
    </li>
  );
}
