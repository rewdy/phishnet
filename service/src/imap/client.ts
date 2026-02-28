import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { AppConfig } from "../config";
import type { EmailMessage } from "../types";

export interface ImapClient {
  listUnread(limit: number): Promise<EmailMessage[]>;
  moveToJunk(uid: number): Promise<void>;
}

export class ICloudImapClient implements ImapClient {
  constructor(private readonly config: AppConfig["imap"]) {}

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      logger: false,
    });
  }

  async listUnread(limit: number): Promise<EmailMessage[]> {
    const client = this.createClient();
    await client.connect();

    try {
      const lock = await client.getMailboxLock(this.config.inboxMailbox);
      try {
        const unreadResult = await client.search({ seen: false }, { uid: true });
        const unreadUids = unreadResult === false ? [] : unreadResult;
        const selectedUids = unreadUids.slice(0, limit);
        if (selectedUids.length === 0) {
          return [];
        }

        const messages: EmailMessage[] = [];
        for await (const msg of client.fetch(
          selectedUids,
          {
            uid: true,
            envelope: true,
            internalDate: true,
            source: true,
          },
          { uid: true },
        )) {
          const from = msg.envelope?.from?.[0];
          const sender = from
            ? `${from.name ?? ""} <${from.address ?? "unknown@unknown"}>`.trim()
            : "unknown@unknown";

          let bodyText = "";
          if (msg.source) {
            const parsed = await simpleParser(msg.source);
            bodyText = parsed.text ?? "";
          }

          messages.push({
            uid: msg.uid,
            messageId: msg.envelope?.messageId ?? undefined,
            from: sender,
            subject: msg.envelope?.subject ?? "",
            bodyText: bodyText.slice(0, 100_000),
            receivedAt: msg.internalDate ? new Date(msg.internalDate) : undefined,
          });
        }

        return messages;
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  async moveToJunk(uid: number): Promise<void> {
    const client = this.createClient();
    await client.connect();

    try {
      const lock = await client.getMailboxLock(this.config.inboxMailbox);
      try {
        const moved = await client.messageMove(uid, this.config.junkMailbox, { uid: true });
        if (!moved) {
          throw new Error(`Failed to move UID ${uid} to mailbox ${this.config.junkMailbox}`);
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }
}
