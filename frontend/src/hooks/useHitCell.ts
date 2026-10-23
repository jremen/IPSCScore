import { useCallback, useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { SCROLL_THRESHOLD_PX, getHitCellClasses } from '../utils/hitCell';

export function useHitCell(
  value: number,
  color: string,
  disabled: boolean | undefined,
  onIncrement: () => void,
  onDecrement: () => void,
) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isScrolling = useRef(false);

  const cancelTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      longPressTriggered.current = false;
      isScrolling.current = false;
      pointerStart.current = { x: event.clientX, y: event.clientY };
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        onDecrement();
      }, 500);
    },
    [onDecrement],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!pointerStart.current || isScrolling.current) return;
      const dx = event.clientX - pointerStart.current.x;
      const dy = event.clientY - pointerStart.current.y;
      if (Math.abs(dx) > SCROLL_THRESHOLD_PX || Math.abs(dy) > SCROLL_THRESHOLD_PX) {
        isScrolling.current = true;
        cancelTimer();
      }
    },
    [cancelTimer],
  );

  const handlePointerUp = useCallback(() => {
    cancelTimer();
    pointerStart.current = null;
    if (!longPressTriggered.current && !isScrolling.current) onIncrement();
  }, [cancelTimer, onIncrement]);

  const handlePointerLeave = useCallback(() => {
    cancelTimer();
    pointerStart.current = null;
  }, [cancelTimer]);

  const handlePointerCancel = useCallback(() => {
    cancelTimer();
    pointerStart.current = null;
    isScrolling.current = true;
  }, [cancelTimer]);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      onDecrement();
    },
    [onDecrement],
  );

  return {
    className: getHitCellClasses(color, value, disabled),
    handlePointerDown: disabled ? undefined : handlePointerDown,
    handlePointerMove: disabled ? undefined : handlePointerMove,
    handlePointerUp: disabled ? undefined : handlePointerUp,
    handlePointerLeave: disabled ? undefined : handlePointerLeave,
    handlePointerCancel: disabled ? undefined : handlePointerCancel,
    handleContextMenu: disabled ? undefined : handleContextMenu,
  };
}
