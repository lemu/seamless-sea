import type { ActivityLogEntry, ActivityTemplate, SentencePart, EntityType } from "../types/activity";
import { activityTemplates } from "./activityLogTemplates";

/**
 * Gets the appropriate template for an activity log entry
 *
 * Tries matching in order of specificity:
 * 1. entityType:action:statusValue (most specific)
 * 2. entityType:action:statusLabel
 * 3. entityType:action (action-level)
 * 4. default (fallback)
 */
export function getActivityTemplate(
  entityType: EntityType,
  action: string,
  status?: { value: string; label: string }
): ActivityTemplate {
  // Try most specific: entityType:action:statusValue
  if (status?.value) {
    const specificKey = `${entityType}:${action}:${status.value}`;
    if (activityTemplates[specificKey]) {
      return activityTemplates[specificKey];
    }

    // Try with normalized status value (remove entity prefix if present)
    const normalizedStatus = status.value.replace(`${entityType}-`, '');
    const normalizedKey = `${entityType}:${action}:${normalizedStatus}`;
    if (activityTemplates[normalizedKey]) {
      return activityTemplates[normalizedKey];
    }

    // Try with status label
    const labelKey = `${entityType}:${action}:${status.label.toLowerCase().replace(/ /g, '-')}`;
    if (activityTemplates[labelKey]) {
      return activityTemplates[labelKey];
    }
  }

  // Try action-level: entityType:action
  const actionKey = `${entityType}:${action}`;
  if (activityTemplates[actionKey]) {
    return activityTemplates[actionKey];
  }

  // Fallback to default
  return activityTemplates.default;
}

/**
 * Transforms status value to ensure it has the entity type prefix
 *
 * Examples:
 * - ("order", "draft") => "order-draft"
 * - ("negotiation", "on-subs") => "negotiation-on-subs"
 * - ("contract", "contract-working-copy") => "contract-working-copy" (already has prefix)
 */
export function normalizeStatusValue(entityType: EntityType, statusValue: string): string {
  // If already has a dash and starts with entity type, return as-is
  if (statusValue.includes('-') && statusValue.startsWith(entityType)) {
    return statusValue;
  }

  // If has dash but different prefix, keep as-is (might be intentional)
  if (statusValue.includes('-')) {
    return statusValue;
  }

  // Add entity type prefix
  return `${entityType}-${statusValue}`;
}

/**
 * Formats an activity log entry into sentence parts for rendering
 *
 * @param entry - The activity log entry from the database
 * @param userName - The name of the user who performed the action
 * @returns Array of sentence parts (text, status badge, userName)
 */
export function formatActivityLog(
  entry: ActivityLogEntry,
  userName: string
): SentencePart[] {
  // Get the appropriate template for this activity
  const template = getActivityTemplate(
    entry.entityType,
    entry.action,
    entry.status
  );

  // Transform template parts with actual data
  return template.parts.map(part => {
    if (part.type === 'userName') {
      return {
        type: 'userName',
        content: userName
      };
    }

    if (part.type === 'status' && entry.status) {
      return {
        type: 'status',
        status: {
          value: normalizeStatusValue(entry.entityType, entry.status.value),
          label: entry.status.label.toLowerCase() // Lowercase for proper sentence capitalization
        }
      };
    }

    if (part.type === 'text') {
      // Handle special placeholders in text
      let content = part.content || '';

      // Replace {description} placeholder with actual description
      if (content.includes('{description}') && entry.description) {
        content = content.replace('{description}', entry.description);
      }

      return {
        type: 'text',
        content
      };
    }

    return part;
  });
}

/**
 * Extracts additional context from description or metadata
 *
 * For example, extracting counterparty names, rejection reasons, etc.
 */
export function extractContextFromEntry(entry: ActivityLogEntry): {
  counterparty?: string;
  reason?: string;
  side?: string;
} {
  const context: { counterparty?: string; reason?: string; side?: string } = {};

  // Extract "with <counterparty>" pattern
  const counterpartyMatch = entry.description.match(/with (.+?)$/);
  if (counterpartyMatch) {
    context.counterparty = counterpartyMatch[1];
  }

  // Extract side (Owner/Charterer) from metadata
  if (entry.metadata?.side) {
    context.side = entry.metadata.side;
  }

  // Extract rejection reason from metadata
  if (entry.metadata?.reason) {
    context.reason = entry.metadata.reason;
  }

  return context;
}
