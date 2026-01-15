import {
  type Connection,
  Server,
  type WSMessage,
  routePartykitRequest,
} from "partyserver";

import type { ChatMessage, Message } from "../shared";

// Configuration constants
const MAX_MESSAGES = 1000; // Maximum messages to store in memory and database
const MAX_MESSAGE_LENGTH = 5000; // Maximum characters per message
const MAX_USERNAME_LENGTH = 50; // Maximum characters for username
const RATE_LIMIT_MESSAGES = 10; // Max messages per time window
const RATE_LIMIT_WINDOW_MS = 10000; // Time window in milliseconds (10 seconds)

// Rate limiting tracker
interface RateLimitTracker {
  count: number;
  windowStart: number;
}

export class Chat extends Server<Env> {
  static options = { hibernate: true };

  messages = [] as ChatMessage[];
  rateLimitMap = new Map<string, RateLimitTracker>();

  broadcastMessage(message: Message, exclude?: string[]) {
    this.broadcast(JSON.stringify(message), exclude);
  }

  // Validate message content
  validateMessage(message: ChatMessage): { valid: boolean; error?: string } {
    if (!message.id || typeof message.id !== "string") {
      return { valid: false, error: "Invalid message ID" };
    }

    if (!message.user || typeof message.user !== "string") {
      return { valid: false, error: "Invalid user name" };
    }

    if (message.user.length > MAX_USERNAME_LENGTH) {
      return {
        valid: false,
        error: `Username too long (max ${MAX_USERNAME_LENGTH} characters)`,
      };
    }

    if (!message.content || typeof message.content !== "string") {
      return { valid: false, error: "Invalid message content" };
    }

    if (message.content.trim().length === 0) {
      return { valid: false, error: "Message content cannot be empty" };
    }

    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
      };
    }

    if (message.role !== "user" && message.role !== "assistant") {
      return { valid: false, error: "Invalid message role" };
    }

    return { valid: true };
  }

  // Check rate limit for a connection
  checkRateLimit(connectionId: string): boolean {
    const now = Date.now();
    const tracker = this.rateLimitMap.get(connectionId);

    if (!tracker || now - tracker.windowStart > RATE_LIMIT_WINDOW_MS) {
      // New window or expired window
      this.rateLimitMap.set(connectionId, { count: 1, windowStart: now });
      return true;
    }

    if (tracker.count >= RATE_LIMIT_MESSAGES) {
      return false;
    }

    tracker.count++;
    return true;
  }

  onStart() {
    try {
      // Create the messages table if it doesn't exist
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user TEXT, role TEXT, content TEXT)`,
      );

      // Load the messages from the database
      const result = this.ctx.storage.sql.exec(`SELECT * FROM messages`);
      this.messages = result.toArray() as ChatMessage[];

      // If we have too many messages, prune old ones
      if (this.messages.length > MAX_MESSAGES) {
        const messagesToKeep = this.messages.slice(-MAX_MESSAGES);
        const idsToKeep = messagesToKeep.map((m) => m.id);

        // Delete old messages from database
        this.ctx.storage.sql.exec(
          `DELETE FROM messages WHERE id NOT IN (${idsToKeep.map(() => "?").join(",")})`,
          ...idsToKeep,
        );

        this.messages = messagesToKeep;
      }
    } catch (error) {
      console.error("Error in onStart:", error);
      // Initialize with empty messages on error
      this.messages = [];
    }
  }

  onConnect(connection: Connection) {
    try {
      connection.send(
        JSON.stringify({
          type: "all",
          messages: this.messages,
        } satisfies Message),
      );
    } catch (error) {
      console.error("Error in onConnect:", error);
    }
  }

  saveMessage(message: ChatMessage) {
    try {
      // Validate the message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        console.error("Message validation failed:", validation.error);
        throw new Error(validation.error);
      }

      // Check if the message already exists
      const existingIndex = this.messages.findIndex((m) => m.id === message.id);
      if (existingIndex !== -1) {
        this.messages[existingIndex] = message;
      } else {
        this.messages.push(message);

        // Prune old messages if we exceed the limit
        if (this.messages.length > MAX_MESSAGES) {
          const oldMessage = this.messages.shift();
          if (oldMessage) {
            // Delete the oldest message from the database
            this.ctx.storage.sql.exec(
              `DELETE FROM messages WHERE id = ?`,
              oldMessage.id,
            );
          }
        }
      }

      // Use parameterized queries to prevent SQL injection
      this.ctx.storage.sql.exec(
        `INSERT INTO messages (id, user, role, content) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET content = ?`,
        message.id,
        message.user,
        message.role,
        message.content,
        message.content,
      );
    } catch (error) {
      console.error("Error saving message:", error);
      throw error;
    }
  }

  onMessage(connection: Connection, message: WSMessage) {
    try {
      // Check rate limit
      if (!this.checkRateLimit(connection.id)) {
        connection.send(
          JSON.stringify({
            type: "error",
            error: "Rate limit exceeded. Please slow down.",
          }),
        );
        return;
      }

      // Parse the message
      let parsed: Message;
      try {
        parsed = JSON.parse(message as string) as Message;
      } catch (error) {
        console.error("Error parsing message:", error);
        connection.send(
          JSON.stringify({
            type: "error",
            error: "Invalid message format",
          }),
        );
        return;
      }

      // Validate and save the message
      if (parsed.type === "add" || parsed.type === "update") {
        try {
          this.saveMessage(parsed);
          // Only broadcast if save was successful
          this.broadcast(message);
        } catch (error) {
          console.error("Error processing message:", error);
          connection.send(
            JSON.stringify({
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to save message",
            }),
          );
        }
      }
    } catch (error) {
      console.error("Error in onMessage:", error);
    }
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, { ...env })) ||
      env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
