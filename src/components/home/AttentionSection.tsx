import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AttentionCard } from "./AttentionCard";

// SVG icons (inline, lightweight)
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.667 2.667H12a1.333 1.333 0 0 1 1.333 1.333v9.333A1.333 1.333 0 0 1 12 14.667H4A1.333 1.333 0 0 1 2.667 13.333V4A1.333 1.333 0 0 1 4 2.667h1.333" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.333 1.333H6.667A.667.667 0 0 0 6 2v1.333a.667.667 0 0 0 .667.667h2.666A.667.667 0 0 0 10 3.333V2a.667.667 0 0 0-.667-.667Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AnchorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="4" r="2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M8 6v8M4 8H2a6 6 0 0 0 12 0h-2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M4 10H2M12 10h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.333 1.333H4A1.333 1.333 0 0 0 2.667 2.667v10.666A1.333 1.333 0 0 0 4 14.667h8a1.333 1.333 0 0 0 1.333-1.334V5.333L9.333 1.333Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.333 1.333v4H13.333" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.667 8.667H5.333M10.667 11.333H5.333M6.667 6H5.333" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 10a1.333 1.333 0 0 1-1.333 1.333H4.667L2 14V2.667A1.333 1.333 0 0 1 3.333 1.333h9.334A1.333 1.333 0 0 1 14 2.667V10Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function AttentionSection() {
  const data = useQuery(api.home.getAttentionItems);
  const isLoading = data === undefined;

  const totalCount = isLoading
    ? 0
    : data.pendingApprovals.count + data.onSubs.count + data.drafts.count + data.activeNegotiations.count;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading-sm text-[var(--color-text-primary)]">Needs Your Attention</h2>
        {!isLoading && totalCount > 0 && (
          <span className="text-body-sm text-[var(--color-text-secondary)]">
            {totalCount} item{totalCount !== 1 ? "s" : ""} total
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AttentionCard
          icon={<ClipboardIcon />}
          title="Pending Approvals"
          count={isLoading ? 0 : data.pendingApprovals.count}
          items={isLoading ? [] : data.pendingApprovals.items}
          isLoading={isLoading}
        />
        <AttentionCard
          icon={<AnchorIcon />}
          title="On Subs"
          count={isLoading ? 0 : data.onSubs.count}
          items={isLoading ? [] : data.onSubs.items}
          isLoading={isLoading}
        />
        <AttentionCard
          icon={<FileIcon />}
          title="Draft Items"
          count={isLoading ? 0 : data.drafts.count}
          items={isLoading ? [] : data.drafts.items}
          isLoading={isLoading}
        />
        <AttentionCard
          icon={<MessageIcon />}
          title="Active Negotiations"
          count={isLoading ? 0 : data.activeNegotiations.count}
          items={isLoading ? [] : data.activeNegotiations.items}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
