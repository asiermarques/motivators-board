import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMoveAnimation } from "../effects/moveAnimation";
import { sidewaysDrop, stepFulfilment, type Fulfilment, type Fulfilments, type Motivator, type Order } from "../model";
import MotivatorCard from "./MotivatorCard";

interface Props {
  motivators: Motivator[];
  order: Order;
  fulfilment: Fulfilments;
  /** A Move: the Card of `key` to Position `to` (0-based). */
  onMove: (key: string, to: number) => void;
  /** The Card of `key` to another sideways place; `undefined` is the centre. */
  onFulfilment: (key: string, fulfilment: Fulfilment | undefined) => void;
}

/** How long the opening deal lasts, so its delays stop applying to later changes. Longer than the last Card's turn. */
const DEAL_DURATION = 2400;

/**
 * The column of Cards, the most important on top, so every Board fits whatever the number of Cards and the width of
 * the screen. Cards move, up and down or sideways to their Fulfilment, by dragging (mouse, touch) or with the keyboard.
 */
export default function Board({ motivators, order, fulfilment, onMove, onFulfilment }: Props) {
  const { t } = useTranslation();
  const byKey = new Map(motivators.map((motivator) => [motivator.key, motivator]));
  const title = (key: unknown) => byKey.get(String(key))?.title ?? String(key);
  const instructionsId = useId();
  const list = useRef<HTMLOListElement>(null);
  const captureForAnimation = useMoveAnimation(list, order, fulfilment);
  const [announcement, setAnnouncement] = useState("");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [dealing, setDealing] = useState(true);
  /** The Card being dragged and the place it would settle in if dropped now: shown before the drop, never stored. */
  const [carried, setCarried] = useState<{ key: string; fulfilment: Fulfilment | undefined } | null>(null);

  // The Cards are dealt from a pile at the first Position when the Board opens (styles.css, off under reduced motion).
  useEffect(() => {
    const timeout = window.setTimeout(() => setDealing(false), DEAL_DURATION);
    return () => window.clearTimeout(timeout);
  }, []);

  // A moved element loses the focus in some browsers: give it back to the Card that moved with the keyboard.
  useEffect(() => {
    if (!focusKey) return;
    list.current?.querySelector<HTMLElement>(`[data-motivator="${focusKey}"]`)?.focus();
    setFocusKey(null);
  }, [focusKey, order]);

  const moved = (key: string, to: number) => t("board.moved", { title: title(key), position: to + 1, count: order.length });
  const placed = (key: string, next: Fulfilment | undefined) => t(`board.${next ?? "centred"}`, { title: title(key) });

  function moveWithKeyboard(key: string, where: "previous" | "next" | "first" | "last") {
    const from = order.indexOf(key);
    const to = { previous: from - 1, next: from + 1, first: 0, last: order.length - 1 }[where];
    if (to < 0 || to >= order.length || to === from) return;
    captureForAnimation();
    onMove(key, to);
    setAnnouncement(moved(key, to));
    setFocusKey(key);
  }

  function stepWithKeyboard(key: string, direction: "left" | "right") {
    const next = stepFulfilment(fulfilment[key], direction);
    if (next === fulfilment[key]) return;
    captureForAnimation();
    onFulfilment(key, next);
    setAnnouncement(placed(key, next));
    setFocusKey(key);
  }

  /** How far apart two sideways places are: the room the column leaves on either side of a Card in the centre. */
  function placeDistance(key: string): number {
    const card = list.current?.querySelector<HTMLElement>(`[data-key="${key}"]`);
    return list.current && card ? (list.current.clientWidth - card.offsetWidth) / 2 : 0;
  }

  function onDragStart({ active }: DragStartEvent) {
    const key = String(active.id);
    setCarried({ key, fulfilment: fulfilment[key] });
  }

  function onDragMove({ active, delta }: DragMoveEvent) {
    const key = String(active.id);
    const next = sidewaysDrop(fulfilment[key], delta.x, placeDistance(key));
    if (carried?.key !== key || carried.fulfilment !== next) setCarried({ key, fulfilment: next });
  }

  // One drag can change the Position (vertically) and the Fulfilment (sideways); both are announced together.
  function onDragEnd({ active, over, delta }: DragEndEvent) {
    setCarried(null);
    const key = String(active.id);
    const from = order.indexOf(key);
    const to = over ? order.indexOf(String(over.id)) : from;
    const next = sidewaysDrop(fulfilment[key], delta.x, placeDistance(key));
    const changes: string[] = [];
    if (to !== from) {
      onMove(key, to);
      changes.push(moved(key, to));
    }
    if (next !== fulfilment[key]) {
      // The Card slides from where it was dropped to its new place.
      captureForAnimation();
      onFulfilment(key, next);
      changes.push(placed(key, next));
    }
    if (changes.length > 0) setAnnouncement(changes.join(" "));
  }

  // Moves and Fulfilment changes are announced by the live region below, for drags and keyboard alike.
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("board.pickedUp", { title: title(active.id) }),
    onDragOver: () => undefined,
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => t("board.cancelled", { title: title(active.id) }),
  };

  // dnd-kit needs the Cards in the order they are seen, the most important on top. The DOM, and so the reading and
  // focus order, stays from least to most important (styles.css draws it with column-reverse).
  const seen = [...order].reverse();

  const sensors = useSensors(
    // A short drag, so a click still flips the Card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press and hold, so a swipe still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  return (
    <section className="board">
      {/* The three sideways places, each tick above where the middle of a Card settles: Unmet, the centre, Met. */}
      <div className="board-places" aria-hidden="true" data-target={carried ? (carried.fulfilment ?? "centre") : undefined}>
        <span className="board-places-end" data-place="unmet">
          {t("fulfilment.unmet")}
        </span>
        <span className="board-places-line">
          <span className="board-places-tick" data-place="unmet" />
          <span className="board-places-tick" data-place="centre" />
          <span className="board-places-tick" data-place="met" />
        </span>
        <span className="board-places-end" data-place="met">
          {t("fulfilment.met")}
        </span>
      </div>
      <div className="board-scale" aria-hidden="true">
        <span className="board-scale-end">{t("board.least")}</span>
        <span className="board-scale-line" />
        <span className="board-scale-end" data-end="most">
          {t("board.most")}
        </span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={() => setCarried(null)}
        accessibility={{ announcements }}
      >
        <SortableContext items={seen} strategy={verticalListSortingStrategy}>
          <ol className="board-cards" aria-label={t("board.label")} ref={list} data-dealing={dealing || undefined}>
            {order.map((key, position) => (
              <MotivatorCard
                key={key}
                motivator={byKey.get(key)!}
                position={position}
                fulfilment={fulfilment[key]}
                marked={carried?.key === key ? carried.fulfilment : fulfilment[key]}
                instructionsId={instructionsId}
                onKeyboardMove={moveWithKeyboard}
                onKeyboardStep={stepWithKeyboard}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <p id={instructionsId} className="visually-hidden">
        {t("board.instructions")}
      </p>
      <p role="status" aria-label={t("board.moves")} className="visually-hidden">
        {announcement}
      </p>
    </section>
  );
}
