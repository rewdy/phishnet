export interface EmailMessage {
  uid: number;
  messageId?: string;
  from: string;
  subject: string;
  bodyText: string;
  receivedAt?: Date;
}

export interface ClassificationInput {
  from: string;
  subject: string;
  bodyText: string;
}

export type ModelAction = "junk" | "keep";

export interface ClassificationResult {
  action: ModelAction;
  confidence: number;
  reasonCode: string;
}

export type FinalAction = "junk" | "keep" | "error" | "allowlist_skip";

export type MessageStatus = "pending" | "processed" | "permanent_failure";

export interface MessageState {
  imapUid: number;
  messageId?: string;
  status: MessageStatus;
  failureCount: number;
  lastError?: string;
  lastAttemptAt?: string;
}

export interface ProcessResult {
  uid: number;
  finalAction: FinalAction;
  movedToJunk: boolean;
}
