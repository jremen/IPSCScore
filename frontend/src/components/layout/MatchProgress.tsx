import { memo } from "react";
import { Progress } from "flowbite-react";
import { useMatchProgressView } from "../../hooks/useMatchProgressView";
import { KIOSK_PROGRESS_THEME } from "../../utils/matchProgress";
import type { MatchProgressProps } from "./types";

const MatchProgress = ({
  size,
  width,
  variant = "default",
  progressValue: externalProgress,
}: MatchProgressProps) => {
  const { progressValue } = useMatchProgressView(externalProgress);

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
