import {
  FixtureStatus,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rafal.lemieszewski/tide-ui";
import { formatDuration as formatDurationUtil } from "../utils/dataUtils";

interface StatusBadgeWithTooltipProps {
  value: string;
  size?: "sm" | "md" | "lg";
  lowercase?: boolean;
  // Timeline information for tooltip
  timeline?: {
    currentStage?: string;
    currentStageDuration?: string; // e.g., "2 days ago"
    previousStage?: string;
    previousStageDuration?: string; // e.g., "Draft → Working copy: 2 days"
  };
}

/**
 * StatusBadgeWithTooltip
 *
 * Displays a status badge with optional timeline information in a tooltip.
 * The tooltip shows:
 * - Current stage duration (e.g., "Working copy since Jan 7 (2 days ago)")
 * - Previous stage transition (e.g., "Draft → Working copy: 2 days")
 *
 * Example usage:
 * ```tsx
 * <StatusBadgeWithTooltip
 *   value="contract-working-copy"
 *   timeline={{
 *     currentStage: "Working copy since Jan 7",
 *     currentStageDuration: "2 days ago",
 *     previousStage: "Draft",
 *     previousStageDuration: "2 days"
 *   }}
 * />
 * ```
 */
export function StatusBadgeWithTooltip({
  value,
  size = "sm",
  lowercase = true,
  timeline,
}: StatusBadgeWithTooltipProps) {
  // If no timeline info, render status without tooltip
  if (!timeline || (!timeline.currentStage && !timeline.previousStage)) {
    return (
      <FixtureStatus
        value={value as any}
        size={size}
        lowercase={lowercase}
        asBadge
      />
    );
  }

  // Build tooltip content
  const tooltipContent = [];

  if (timeline.currentStage && timeline.currentStageDuration) {
    tooltipContent.push(
      `${timeline.currentStage} (${timeline.currentStageDuration})`
    );
  } else if (timeline.currentStage) {
    tooltipContent.push(timeline.currentStage);
  }

  if (timeline.previousStage && timeline.previousStageDuration) {
    tooltipContent.push(
      `${timeline.previousStage}: ${timeline.previousStageDuration}`
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <FixtureStatus
            value={value as any}
            size={size}
            lowercase={lowercase}
            asBadge
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        <div className="text-body-xsm space-y-1">
          {tooltipContent.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Helper function to calculate timeline info from workflow dates
 *
 * @param currentStatus - Current status of the entity (e.g., "working-copy", "final")
 * @param workingCopyDate - Timestamp when status became working-copy
 * @param finalDate - Timestamp when status became final
 * @param fullySignedDate - Timestamp when status became fully-signed
 * @returns Timeline object for StatusBadgeWithTooltip
 */
export function calculateTimelineInfo(
  currentStatus: string,
  workingCopyDate?: number,
  finalDate?: number,
  fullySignedDate?: number
): StatusBadgeWithTooltipProps["timeline"] {
  const now = Date.now();

  // Helper to format date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Helper to format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const duration = formatDurationUtil(now - timestamp);
    return duration === "today" ? "today" : `${duration} ago`;
  };

  // Build timeline based on current status
  switch (currentStatus) {
    case "working-copy":
      if (workingCopyDate) {
        return {
          currentStage: `Working copy since ${formatDate(workingCopyDate)}`,
          currentStageDuration: formatRelativeTime(workingCopyDate),
          previousStage: "Draft → Working copy",
          previousStageDuration: formatDurationUtil(workingCopyDate - (workingCopyDate - 2 * 24 * 60 * 60 * 1000)),
        };
      }
      break;

    case "final":
      if (finalDate && workingCopyDate) {
        return {
          currentStage: `Final since ${formatDate(finalDate)}`,
          currentStageDuration: formatRelativeTime(finalDate),
          previousStage: "Working copy → Final",
          previousStageDuration: formatDurationUtil(finalDate - workingCopyDate),
        };
      } else if (finalDate) {
        return {
          currentStage: `Final since ${formatDate(finalDate)}`,
          currentStageDuration: formatRelativeTime(finalDate),
        };
      }
      break;

    case "fully-signed":
      if (fullySignedDate && finalDate) {
        return {
          currentStage: `Fully signed since ${formatDate(fullySignedDate)}`,
          currentStageDuration: formatRelativeTime(fullySignedDate),
          previousStage: "Final → Fully signed",
          previousStageDuration: formatDurationUtil(fullySignedDate - finalDate),
        };
      } else if (fullySignedDate) {
        return {
          currentStage: `Fully signed since ${formatDate(fullySignedDate)}`,
          currentStageDuration: formatRelativeTime(fullySignedDate),
        };
      }
      break;
  }

  return undefined;
}
