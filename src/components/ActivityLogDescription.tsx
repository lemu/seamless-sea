import * as React from "react";
import {
  ActivityLogDescription as TideActivityLogDescription,
  ActivityLogTime,
  ActivityLogChevron,
  FixtureStatus,
  type StatusValue,
} from "@rafal.lemieszewski/tide-ui";
import type { ActivityLogEntry } from "../types/activity";
import { formatActivityLog } from "../utils/activityLogFormatter";

interface FormattedActivityLogDescriptionProps {
  entry: ActivityLogEntry;
  userName: string;
  formattedTimestamp: string;
}

/**
 * Renders an activity log entry as a natural language sentence
 * with status badges intertwined at appropriate positions.
 * If the entry has expandable data, it also renders a chevron
 * and expandable content section.
 *
 * Examples:
 * - "Rafał Lemieszewski created [order draft]"
 * - "Rafał Lemieszewski [distributed] the order to the market"
 * - "Ivy Chu sent [indicative bid]" (with expandable parameters)
 */
export function FormattedActivityLogDescription({
  entry,
  userName,
  formattedTimestamp
}: FormattedActivityLogDescriptionProps) {
  // Transform the activity log entry into sentence parts
  const sentenceParts = formatActivityLog(entry, userName);
  const hasExpandable = entry.expandable?.data && entry.expandable.data.length > 0;

  return (
    <TideActivityLogDescription>
      {sentenceParts.map((part, index) => {
        // Render user name with emphasis
        if (part.type === 'userName' && part.content) {
          return (
            <span key={index} className="text-body-medium-sm">
              {part.content}
            </span>
          );
        }

        // Render status badge using FixtureStatus component
        if (part.type === 'status' && part.status) {
          return (
            <FixtureStatus
              key={index}
              value={part.status.value as StatusValue}
              size="xsm"
              lowercase={true}
              asBadge
            />
          );
        }

        // Render plain text
        if (part.type === 'text' && part.content) {
          return <span key={index}>{part.content}</span>;
        }

        return null;
      })}

      {/* Timestamp always appears at the end */}
      <ActivityLogTime>{formattedTimestamp}</ActivityLogTime>

      {/* Chevron for collapsible entries */}
      {hasExpandable && <ActivityLogChevron />}
    </TideActivityLogDescription>
  );
}

// Helper function to render expandable content (to be used in parent component)
export function ActivityLogExpandableContent({ entry }: { entry: ActivityLogEntry }) {
  if (!entry.expandable?.data || entry.expandable.data.length === 0) {
    return null;
  }

  return (
    <div className="w-fit overflow-hidden rounded-lg border border-[var(--color-border-primary-medium)]">
      <table className="w-auto">
        <tbody>
          {entry.expandable.data.map((param, idx) => (
            <tr key={idx} className="border-b border-[var(--color-border-primary-medium)] last:border-b-0">
              <td className="px-2 py-1 bg-[var(--color-surface-base)] text-body-strong-xsm text-[var(--color-text-primary)] border-r border-[var(--color-border-primary-medium)]">
                {param.label}
              </td>
              <td className="px-2 py-1 text-right text-body-xsm text-[var(--color-text-primary)]">
                {renderParameterValue(param.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Render parameter value with change detection.
 * If the value contains " → ", it's a change, so show strikethrough old value.
 */
function renderParameterValue(value: string): React.ReactElement {
  // Detect "old → new" format for changed parameters
  if (value.includes(' → ')) {
    const [oldValue, newValue] = value.split(' → ');
    return (
      <span>
        <s className="text-[var(--color-text-tertiary)]">{oldValue.trim()}</s>
        <span className="text-[var(--color-text-tertiary)] mx-1.5">→</span>
        <span className="font-semibold">{newValue.trim()}</span>
      </span>
    );
  }
  // Plain text for unchanged parameters
  return <span>{value}</span>;
}
