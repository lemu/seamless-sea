import * as React from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Icon,
  AttributesItem,
  AttributesRow,
  AttributesLabel,
  AttributesValue,
  AttributesContent,
  AttributesChevron,
  ActivityLog,
  ActivityLogItem,
  ActivityLogHeader,
  ActivityLogDescription,
  ActivityLogTime,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@rafal.lemieszewski/tide-ui";
import { formatDateTime } from "../utils/dataUtils";

interface ApprovalSignatureRecord {
  _id: string;
  partyRole: string;
  status: "pending" | "approved" | "rejected" | "signed";
  company?: {
    _id: string;
    name: string;
  };
  companyAvatarUrl?: string | null;
  user?: {
    _id: string;
    name: string;
  } | null;
  userAvatarUrl?: string | null;
  approvedAt?: number;
  signedAt?: number;
  signingMethod?: string;
  notes?: string;
}

interface ApprovalSignatureRowProps {
  label: string; // "Contract Approval" or "Contract Signature"
  type: "approval" | "signature";
  records: ApprovalSignatureRecord[];
  summary: {
    total: number;
    approved?: number;
    signed?: number;
    pending: number;
    rejected: number;
  };
}

/**
 * ApprovalSignatureRow
 *
 * Displays a compact, expandable row showing approval or signature status.
 * - Shows avatars with status indicators (✓ approved/signed, ⏳ pending)
 * - Displays progress count "(X/Y approved)" or "(X/Y signed)"
 * - Expands to show detailed information about who approved/signed when
 *
 * Example usage:
 * ```tsx
 * <ApprovalSignatureRow
 *   label="Contract Approval"
 *   type="approval"
 *   records={approvals}
 *   summary={{ total: 2, approved: 1, pending: 1, rejected: 0 }}
 * />
 * ```
 */
export function ApprovalSignatureRow({
  label,
  type,
  records,
  summary,
}: ApprovalSignatureRowProps) {
  // Helper to get company initials for avatar fallback
  const getInitials = (name: string): string => {
    const words = name.split(" ").filter((w) => w.length > 0);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };


  // Helper to format signing method
  const formatSigningMethod = (method: string): string => {
    if (method === "Manual") {
      return "manual signature";
    }
    return method;
  };

  // Determine progress text
  const completedCount =
    type === "approval" ? summary.approved || 0 : summary.signed || 0;
  const progressText = `(${completedCount}/${summary.total} ${type === "approval" ? "approved" : "signed"})`;

  // Sort records: completed first, then pending, then rejected
  const sortedRecords = [...records].sort((a, b) => {
    const statusOrder = {
      approved: 0,
      signed: 0,
      pending: 1,
      rejected: 2,
    };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <AttributesItem collapsible={true} defaultOpen={false}>
      <AttributesRow asCollapsibleTrigger={true}>
        <AttributesLabel>{label}</AttributesLabel>
        <AttributesValue>
          <div className="flex items-center gap-2">
            {/* Avatar indicators */}
            <div className="flex items-center">
              {sortedRecords.slice(0, 4).map((record, index) => {
                const isComplete =
                  record.status === "approved" || record.status === "signed";
                const isPending = record.status === "pending";
                const isRejected = record.status === "rejected";
                const timestamp = record.approvedAt || record.signedAt;

                // Build tooltip content
                const userName = record.user?.name || "Pending assignment";
                const tooltipDate = timestamp ? formatDateTime(timestamp) : null;
                const tooltipContent = tooltipDate
                  ? `${userName}\n${type === "approval" ? "Approved" : "Signed"}: ${tooltipDate}`
                  : userName;

                return (
                  <React.Fragment key={record._id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative flex items-center w-[30px] flex-shrink-0 cursor-default">
                          <Avatar size="xxs">
                            {record.userAvatarUrl ? (
                              <AvatarImage src={record.userAvatarUrl} alt={record.user?.name} />
                            ) : (
                              <AvatarFallback size="xxs">
                                {record.user ? getInitials(record.user.name) : "?"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {/* Status indicator overlay */}
                          <div className="absolute top-0 right-0">
                            {isComplete && (
                              <div className="w-4 h-4 rounded-full bg-[var(--color-surface-base)] border-2 border-[var(--color-text-success-bold)] flex items-center justify-center">
                                <Icon
                                  name="approved"
                                  size="md"
                                  className="text-[var(--color-text-success-bold)] translate-x-[1px] translate-y-[1px]"
                                />
                              </div>
                            )}
                            {isPending && (
                              <div className="w-4 h-4 rounded-full bg-[var(--color-surface-base)] border-2 border-[var(--color-icon-warning-bold)] flex items-center justify-center">
                                <Icon
                                  name="pending-approval"
                                  size="md"
                                  className="text-[var(--color-icon-warning-bold)] translate-x-[1px] translate-y-[1px]"
                                />
                              </div>
                            )}
                            {isRejected && (
                              <div className="w-4 h-4 rounded-full bg-[var(--color-surface-base)] border-2 border-[var(--color-text-danger)] flex items-center justify-center">
                                <Icon
                                  name="XCircle"
                                  size="md"
                                  className="text-[var(--color-text-danger)] translate-x-[1px] translate-y-[1px]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center whitespace-pre-line">{tooltipContent}</div>
                      </TooltipContent>
                    </Tooltip>
                    {index < sortedRecords.slice(0, 4).length - 1 && (
                      <div className="w-1 h-1 rounded-full bg-[var(--color-text-secondary)] mx-1" />
                    )}
                  </React.Fragment>
                );
              })}
              {sortedRecords.length > 4 && (
                <div className="text-body-xsm text-[var(--color-text-secondary)] pl-3">
                  +{sortedRecords.length - 4}
                </div>
              )}
            </div>

            {/* Progress count */}
            <span className="text-body-sm text-[var(--color-text-secondary)]">
              {progressText}
            </span>

            {/* Expand/collapse chevron */}
            <AttributesChevron />
          </div>
        </AttributesValue>
      </AttributesRow>

      {/* Expandable content */}
      <AttributesContent className="pb-0" style={{ gridColumn: 2 }}>
        <div className="rounded bg-[var(--color-surface-sunken)] p-2">
          <ActivityLog>
            {sortedRecords.map((record) => {
              const isComplete =
                record.status === "approved" || record.status === "signed";
              const isPending = record.status === "pending";
              const isRejected = record.status === "rejected";
              const timestamp = (record.approvedAt || record.signedAt) as number;

              return (
                <ActivityLogItem key={record._id}>
                  <ActivityLogHeader>
                    <Avatar size="xxs">
                      {record.userAvatarUrl ? (
                        <AvatarImage src={record.userAvatarUrl} alt={record.user?.name} />
                      ) : (
                        <AvatarFallback size="xxs">
                          {record.user ? getInitials(record.user.name) : "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <ActivityLogDescription>
                      <span className="text-body-medium-sm">
                        {record.user?.name || "Pending assignment"}
                      </span>
                      {isComplete && (
                        <>
                          <span>
                            {type === "approval" ? "approved the contract" : "signed the contract"}
                          </span>
                          {record.signingMethod && <span>via {formatSigningMethod(record.signingMethod)}</span>}
                          {record.company && (
                            <span className="text-body-sm text-[var(--color-text-secondary)]">
                              ({record.partyRole} - {record.company.name})
                            </span>
                          )}
                          {timestamp && <ActivityLogTime>{formatDateTime(timestamp)}</ActivityLogTime>}
                        </>
                      )}
                      {isPending && (
                        <>
                          <span>{type === "approval" ? "pending review" : "awaiting signature"}</span>
                          {record.company && (
                            <span className="text-body-sm text-[var(--color-text-secondary)]">
                              ({record.partyRole} - {record.company.name})
                            </span>
                          )}
                        </>
                      )}
                      {isRejected && (
                        <>
                          <span className="text-[var(--color-text-danger)]">rejected</span>
                          {record.notes && <span>- {record.notes}</span>}
                          {record.company && (
                            <span className="text-body-sm text-[var(--color-text-secondary)]">
                              ({record.partyRole} - {record.company.name})
                            </span>
                          )}
                          {timestamp && <ActivityLogTime>{formatDateTime(timestamp)}</ActivityLogTime>}
                        </>
                      )}
                    </ActivityLogDescription>
                  </ActivityLogHeader>
                </ActivityLogItem>
              );
            })}
          </ActivityLog>
        </div>
      </AttributesContent>
    </AttributesItem>
  );
}
