import { useHitCell } from '../../../hooks/useHitCell';
import type { HitCellProps } from '../types';

/** Clickable hit cell — tap to +1, long-press/right-click to -1 */
export default function HitCell({ value, color, onIncrement, onDecrement, disabled }: HitCellProps) {
  const {
    className,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
    handleContextMenu,
  } = useHitCell(value, color, disabled, onIncrement, onDecrement);

  return (
    <button
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onContextMenu={handleContextMenu}
      disabled={disabled}
    >
      {value}
    </button>
  );
}
