export type EntityType = "order" | "negotiation" | "contract" | "recap_manager";

export type ActivityAction =
  | "created"
  | "distributed"
  | "answered"
  | "fixed"
  | "withdrawn"
  | "signed"
  | "updated"
  | "canceled"
  | "sent"
  | "accepted"
  | "rejected"
  | "approved"
  | "status-changed"
  | "on-subs"
  | "compliance-check";

export interface ActivityLogEntry {
  entityType: EntityType;
  entityId?: string;
  action: string;
  description: string;
  status?: {
    value: string;
    label: string;
  };
  user?: {
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
    avatarUrl?: string | null;
  } | null;
  timestamp: number;
  metadata?: any;
  expandable?: {
    data?: Array<{
      label: string;
      value: string;
    }>;
    content?: string;
  };
}

export type SentencePartType = 'text' | 'status' | 'userName';

export interface SentencePart {
  type: SentencePartType;
  content?: string;
  status?: {
    value: string;
    label: string;
  };
}

export interface ActivityTemplate {
  parts: SentencePart[];
}
