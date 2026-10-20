import { memo, useEffect } from "react";
import { useMatchStore } from "../../stores/matchStore";
import { useUIStore } from "../../stores/uiStore";
import { Progress } from "flowbite-react";
import { useMatchProgress } from "../../hooks/useMatchProgress";
import { useSSEStore } from "../../stores/sseStore";

const POLL_INTERVAL_MS = 60000;
const SSE_FALLBACK_INTERVAL_MS = 300000;

/**
 * Explicit dark theme for the TV kiosk. The kiosk has its own dark shell, but it
 * does not inherit the app's `.dark` context, so Flowbite would otherwise render
 * a light track with dark text. Dark blue fill + white percentage.
 */
const KIOSK_PROGRESS_THEME = {
  base: "bg-slate-800 dark:bg-slate-800",
  bar: "text-white dark:text-white",
  color: { blue: "bg-blue-700 dark:bg-blue-700" },
};

const MatchProgress = ({
  size,
  width,
  variant = "default",
  progressValue: externalProgress,
}: {
  size?: "xl" | undefined;
  width?: string;
  variant?: "default" | "kiosk";
  /**
   * Pre-computed percentage. When provided (e.g. by the public kiosk, which
   * cannot access the protected scoring endpoints) the internal store-based
   * fetching is skipped and this value is displayed as-is.
   */
  progressValue?: number;
}) => {
const runningMatchId = useMatchStore((s) => s.runningMatch?.id);
const activeMatchId = useUIStore((s) => s.activeMatchId);
const effectiveMatchId = runningMatchId ?? activeMatchId;
const sseConnected = useSSEStore((s) => s.connected);
const {scoredLength, stagesLength, registrationsLength, fetchRegistrations, fetchScoringProgress, fetchStages} = useMatchProgress();

  // fetch + polling (ONLY side effects)
  useEffect(() => {
    // Externally supplied progress (public kiosk) — no auth, no fetching.
    if (externalProgress !== undefined) return;
    if (!effectiveMatchId) return;

    fetchRegistrations(effectiveMatchId);
    fetchStages(effectiveMatchId);
    fetchScoringProgress(effectiveMatchId);

    const interval = setInterval(() => {
      fetchScoringProgress(effectiveMatchId);
    }, sseConnected ? SSE_FALLBACK_INTERVAL_MS : POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [effectiveMatchId, sseConnected, externalProgress]);

  // ✅ ALWAYS derived during render (NO useEffect)
  const full = stagesLength * registrationsLength;

  const computedProgress =
    full > 0
      ? Math.min(100, Number(((scoredLength / full) * 100).toFixed(2)))
      : 0;

  const progressValue = externalProgress !== undefined ? externalProgress : computedProgress;

  return (
    <div className="ml-auto mr-4">
      <Progress
        className={`flex-1 ${width ? width : "w-48"} eink:border eink:border-black! eink:text-white`}
        color="blue"
        size={size ? size : "lg"}
        progress={progressValue}
        labelProgress
        theme={variant === "kiosk" ? KIOSK_PROGRESS_THEME : undefined}
      />
    </div>
  );
};

export default memo(MatchProgress);
