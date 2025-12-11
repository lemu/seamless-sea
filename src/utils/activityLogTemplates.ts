import type { ActivityTemplate } from "../types/activity";

/**
 * Activity log sentence templates
 *
 * Templates define how activity log entries are transformed into natural language sentences
 * with status badges intertwined at the appropriate positions.
 *
 * Template keys follow the pattern: "entityType:action:statusValue"
 * - Specific templates: "order:created:draft"
 * - Action-only templates: "order:created"
 * - Fallback: "default"
 */
export const activityTemplates: Record<string, ActivityTemplate> = {
  // ======================
  // Order Activities
  // ======================

  "order:created": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' created ' },
      { type: 'status' }
    ]
  },

  "order:distributed": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' ' },
      { type: 'status' },
      { type: 'text', content: ' the order to the market' }
    ]
  },

  "order:withdrawn": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' ' },
      { type: 'status' },
      { type: 'text', content: ' the order from the market' }
    ]
  },

  "order:updated": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' updated the order' }
    ]
  },

  // ======================
  // Negotiation Activities
  // ======================

  // Sending bids/offers
  "negotiation:sent": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' sent ' },
      { type: 'status' }
    ]
  },

  "negotiation:created": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' sent ' },
      { type: 'status' }
    ]
  },

  // Answering with counter-offers
  "negotiation:answered": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' answered with ' },
      { type: 'status' }
    ]
  },

  // Accepting bids - "accepted firm bid. Offer is now [firm]"
  "negotiation:accepted": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' accepted firm bid. Offer is now ' },
      { type: 'status' }
    ]
  },

  // Fixing negotiation - "set negotiation as [fixed]"
  "negotiation:fixed": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' set negotiation as ' },
      { type: 'status' }
    ]
  },

  // On subs - "went [on subs]"
  "negotiation:on-subs": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' went ' },
      { type: 'status' }
    ]
  },

  "negotiation:updated:on-subs": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' went ' },
      { type: 'status' }
    ]
  },

  // Generic negotiation update
  "negotiation:updated": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' updated ' },
      { type: 'status' }
    ]
  },

  // Withdrawn negotiation
  "negotiation:withdrawn": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' ' },
      { type: 'status' },
      { type: 'text', content: ' from negotiations' }
    ]
  },

  // Specific status templates for lifecycle progression
  "negotiation:sent:indicative-bid": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' sent ' },
      { type: 'status' }
    ]
  },

  "negotiation:sent:firm-bid": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' sent ' },
      { type: 'status' }
    ]
  },

  // Accepted and firm - "accepted the terms. Negotiation is now [firm]"
  "negotiation:accepted:negotiation-firm": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' accepted the terms. Negotiation is now ' },
      { type: 'status' }
    ]
  },

  // Fixed negotiation - "set negotiation as [fixed]. All subjects lifted"
  "negotiation:fixed:negotiation-fixed": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' set negotiation as ' },
      { type: 'status' },
      { type: 'text', content: '. All subjects lifted' }
    ]
  },

  // On subs - "went [on subs]. Subject to final conditions"
  "negotiation:on-subs:negotiation-on-subs": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' went ' },
      { type: 'status' },
      { type: 'text', content: '. Subject to final conditions' }
    ]
  },

  // Amended - "amended terms. Negotiation is [firm amendment]"
  "negotiation:amended": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' amended terms. Negotiation is ' },
      { type: 'status' }
    ]
  },

  "negotiation:amended:negotiation-firm-amendment": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' amended terms. Negotiation is ' },
      { type: 'status' }
    ]
  },

  // On subs amendment - "went [on subs] following amendment"
  "negotiation:on-subs:negotiation-on-subs-amendment": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' went ' },
      { type: 'status' },
      { type: 'text', content: ' following amendment' }
    ]
  },

  // Firm offer expired - "[expired]. Offer validity period ended"
  "negotiation:expired": {
    parts: [
      { type: 'status' },
      { type: 'text', content: '. Offer validity period ended' }
    ]
  },

  "negotiation:expired:negotiation-firm-offer-expired": {
    parts: [
      { type: 'status' },
      { type: 'text', content: '. Offer validity period ended' }
    ]
  },

  // Subs expired - "[Subs expired]. Subject conditions not met in time"
  "negotiation:subs-expired": {
    parts: [
      { type: 'status' },
      { type: 'text', content: '. Subject conditions not met in time' }
    ]
  },

  "negotiation:expired:negotiation-subs-expired": {
    parts: [
      { type: 'status' },
      { type: 'text', content: '. Subject conditions not met in time' }
    ]
  },

  // Subs failed - "[Subs failed]. Subject conditions could not be satisfied"
  "negotiation:subs-failed": {
    parts: [
      { type: 'status' },
      { type: 'text', content: '. Subject conditions could not be satisfied' }
    ]
  },

  "negotiation:failed:negotiation-subs-failed": {
    parts: [
      { type: 'status' },
      { type: 'text', content: '. Subject conditions could not be satisfied' }
    ]
  },

  // ======================
  // Contract Activities
  // ======================

  // Created - "Contract [draft] was created"
  "contract:created": {
    parts: [
      { type: 'text', content: 'Contract ' },
      { type: 'status' },
      { type: 'text', content: ' was created' }
    ]
  },

  // Updated - "made changes to contract [draft]"
  "contract:updated": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' made changes to contract ' },
      { type: 'status' }
    ]
  },

  // Status changed - "changed contract status to [working copy]"
  "contract:status-changed": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' changed contract status to ' },
      { type: 'status' }
    ]
  },

  // Signed - "signed the contract. Status is now [final]"
  "contract:signed": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' signed the contract. Status is now ' },
      { type: 'status' }
    ]
  },

  // Approved - "approved contract"
  "contract:approved": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' approved contract' }
    ]
  },

  // Rejected - "[rejected] during approval process"
  "contract:rejected": {
    parts: [
      { type: 'status' },
      { type: 'text', content: ' during approval process' }
    ]
  },

  "contract:rejected:contract-rejected": {
    parts: [
      { type: 'status' },
      { type: 'text', content: ' during approval process' }
    ]
  },

  // Created draft - "created [draft] contract"
  "contract:created:contract-draft": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' created ' },
      { type: 'status' },
      { type: 'text', content: ' contract' }
    ]
  },

  // Status changed to working copy
  "contract:status-changed:contract-working-copy": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' changed contract status to ' },
      { type: 'status' }
    ]
  },

  // Signed final
  "contract:signed:contract-final": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' signed the contract. Status is now ' },
      { type: 'status' }
    ]
  },

  // Added approver - "added approver"
  "contract:approver-added": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' added approver' }
    ]
  },

  // ======================
  // Compliance & System
  // ======================

  "compliance:check-finished": {
    parts: [
      { type: 'text', content: 'Compliance check has finished with the result ' },
      { type: 'status' }
    ]
  },

  "system:status-changed": {
    parts: [
      { type: 'text', content: 'Status changed to ' },
      { type: 'status' }
    ]
  },

  // ======================
  // Default Fallback
  // ======================

  /**
   * Default template used when no specific template matches
   * Format: "UserName [Status] description"
   */
  "default": {
    parts: [
      { type: 'userName' },
      { type: 'text', content: ' ' },
      { type: 'status' }
    ]
  }
};
