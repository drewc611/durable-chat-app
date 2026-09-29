import { names } from "../shared";

// nanoid's default alphabet, which is what the client uses for room and message ids.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const MAX_FRAME_CHARS = 8 * 1024;
export const MAX_CONTENT_CHARS = 2000;
export const MAX_STORED_MESSAGES = 500;

export type ClientMessage = {
  type: "add" | "update";
  id: string;
  content: string;
  user: string;
};

export function isValidRoomName(name: unknown): name is string {
  return typeof name === "string" && ID_PATTERN.test(name);
}

/**
 * Parses one WebSocket frame from a client. Returns null for anything that is
 * not an "add" or "update" message with a known id, user name and bounded
 * content. `role` is never read from the frame: clients are always "user".
 */
export function parseClientMessage(frame: unknown): ClientMessage | null {
  if (typeof frame !== "string" || frame.length > MAX_FRAME_CHARS) return null;

  let value: unknown;
  try {
    value = JSON.parse(frame);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const { type, id, content, user } = value as Record<string, unknown>;
  if (type !== "add" && type !== "update") return null;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return null;
  if (typeof content !== "string" || content.length > MAX_CONTENT_CHARS) {
    return null;
  }
  if (typeof user !== "string" || !names.includes(user)) return null;

  return { type, id, content, user };
}

/** Token bucket, one per connection. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; updated: number }>();

  constructor(
    private capacity: number,
    private refillPerSecond: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const bucket = this.buckets.get(key) ?? {
      tokens: this.capacity,
      updated: now,
    };
    const elapsed = Math.max(0, now - bucket.updated) / 1000;
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + elapsed * this.refillPerSecond,
    );
    bucket.updated = now;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return allowed;
  }

  forget(key: string) {
    this.buckets.delete(key);
  }
}
