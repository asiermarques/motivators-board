// Animates Cards to their new place after a Move or a Fulfilment change: each Card slides from where it was to where it
// is now, up and down or sideways. Vertical drags need no help, dnd-kit already shows the Cards where they land.
// Off under prefers-reduced-motion. The domain never waits for or depends on it.
import { useLayoutEffect, useRef, type RefObject } from "react";

const DURATION = 220;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

export const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Where each `[data-key]` child of the container is, in the container's own coordinates (scrolling aside). */
function positions(container: HTMLElement): Map<string, { x: number; y: number }> {
  const origin = container.getBoundingClientRect();
  const result = new Map<string, { x: number; y: number }>();
  for (const item of container.querySelectorAll<HTMLElement>("[data-key]")) {
    const rect = item.getBoundingClientRect();
    result.set(item.dataset.key!, { x: rect.left - origin.left + container.scrollLeft, y: rect.top - origin.top + container.scrollTop });
  }
  return result;
}

/**
 * Returns `capture`, to call right before a Move or a Fulfilment change: once the new Order or Fulfilment is laid out,
 * the Cards slide from the captured positions to their new ones.
 */
export function useMoveAnimation(container: RefObject<HTMLElement | null>, order: readonly string[], fulfilment: object): () => void {
  const captured = useRef<Map<string, { x: number; y: number }> | null>(null);

  useLayoutEffect(() => {
    const element = container.current;
    const before = captured.current;
    captured.current = null;
    if (!element || !before || prefersReducedMotion()) return;
    const after = positions(element);
    for (const item of element.querySelectorAll<HTMLElement>("[data-key]")) {
      const from = before.get(item.dataset.key!);
      const to = after.get(item.dataset.key!);
      if (!from || !to || typeof item.animate !== "function") continue;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      item.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: DURATION, easing: EASING });
    }
  }, [container, order, fulfilment]);

  return () => {
    if (container.current) captured.current = positions(container.current);
  };
}
