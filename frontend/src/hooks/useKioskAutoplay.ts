import { useEffect, useRef } from 'react';

export interface KioskAutoplayOptions {
  /**
   * Identifies the currently displayed slide. Changing this value restarts the
   * cycle from the top. Include a monotonically increasing counter in the key
   * so a single-slide kiosk still advances on every cycle.
   */
  itemKey: string;
  /**
   * The scroll viewport (clips the content) to drive. Passing the element (not
   * a ref) means the cycle restarts whenever the element is attached or
   * replaced — e.g. when the kiosk switches out of a loading state.
   */
  viewport: HTMLElement | null;
  /** Called once the current slide has been fully shown. */
  onAdvance: () => void;
  /** Disable the cycle entirely (e.g. while loading). Defaults to true. */
  enabled?: boolean;
  /** Milliseconds to hold a slide that fits without scrolling. Default 12000. */
  holdMs?: number;
  /** Milliseconds to wait at the top before the overflow scroll starts. Default 2500. */
  startDelayMs?: number;
  /** Milliseconds to hold at the bottom before advancing. Default 5000. */
  endHoldMs?: number;
  /** Scroll speed in CSS pixels per second. Default 32. */
  scrollSpeed?: number;
  /**
   * Upper bound for a single overflow scroll. If the content is taller than
   * `scrollSpeed` would cover in this time, the speed is raised so one very
   * long division cannot monopolize the rotation. Default 45000.
   */
  maxScrollMs?: number;
}

/**
 * TV kiosk slide cycle.
 *
 * A slide that fits inside the viewport is simply held for `holdMs`. A slide
 * that overflows is held at the top, then scrolled to the bottom at a constant
 * ~`scrollSpeed` px/s, then held again before `onAdvance` is called.
 *
 * The overflow amount is re-measured on every frame so the cycle adapts when
 * live results add rows while the slide is already scrolling.
 */
export function useKioskAutoplay({
  itemKey,
  viewport,
  onAdvance,
  enabled = true,
  holdMs = 12000,
  startDelayMs = 2500,
  endHoldMs = 5000,
  scrollSpeed = 32,
  maxScrollMs = 45000,
}: KioskAutoplayOptions) {
  // Keep the latest callback in a ref so inline callbacks don't restart the cycle.
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(() => {
    if (!enabled || !viewport) return;

    let disposed = false;
    let rafId = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const advance = () => {
      if (!disposed) onAdvanceRef.current();
    };

    const measureOverflow = () =>
      Math.max(0, viewport.scrollHeight - viewport.clientHeight);

    const schedule = (fn: () => void, delay: number) => {
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, delay);
    };

    // Start each slide at the top.
    viewport.scrollTop = 0;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const startScroll = () => {
      const max = measureOverflow();
      if (max <= 4) {
        schedule(advance, endHoldMs);
        return;
      }

      if (prefersReducedMotion) {
        viewport.scrollTop = max;
        schedule(advance, endHoldMs);
        return;
      }

      // Guarantee a floor on the pace for very long division lists.
      const effectiveSpeed = Math.max(scrollSpeed, max / (maxScrollMs / 1000));

      // Browsers snap `scrollTop` to whole pixels, so accumulating the position
      // on the element alone silently loses the sub-pixel steps between frames
      // (at 32 px/s and 60 fps that is ~0.53 px per frame — always rounded back
      // to 0, so the slide never moves). Keep the exact position here and push
      // it to the element on every frame.
      let position = viewport.scrollTop;
      let last = performance.now();
      const step = (now: number) => {
        if (disposed) return;
        const target = measureOverflow();
        if (target <= 4 || position >= target - 1) {
          viewport.scrollTop = target;
          schedule(advance, endHoldMs);
          return;
        }
        const dt = Math.min(0.25, (now - last) / 1000);
        last = now;
        position = Math.min(target, position + effectiveSpeed * dt);
        viewport.scrollTop = position;
        rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

    // Wait two frames so newly rendered rows are laid out before measuring.
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        if (disposed) return;
        const max = measureOverflow();
        if (max <= 4) {
          schedule(advance, holdMs);
        } else {
          schedule(startScroll, startDelayMs);
        }
      });
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (timer) clearTimeout(timer);
    };
  }, [itemKey, enabled, viewport, holdMs, startDelayMs, endHoldMs, scrollSpeed, maxScrollMs]);
}
