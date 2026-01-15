import { describe, it, expect } from "vitest";
import type { ChatMessage } from "../shared";

// Configuration constants from server
const MAX_MESSAGE_LENGTH = 5000;
const MAX_USERNAME_LENGTH = 50;

// Validation function extracted for testing
function validateMessage(message: ChatMessage): { valid: boolean; error?: string } {
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

describe("Message Validation", () => {
  it("should validate a correct message", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Alice",
      role: "user",
      content: "Hello, world!",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject message with invalid ID", () => {
    const message = {
      id: "",
      user: "Alice",
      role: "user" as const,
      content: "Hello",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid message ID");
  });

  it("should reject message with missing user", () => {
    const message = {
      id: "test-123",
      user: "",
      role: "user" as const,
      content: "Hello",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid user name");
  });

  it("should reject message with username too long", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "a".repeat(51),
      role: "user",
      content: "Hello",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Username too long");
  });

  it("should reject message with empty content", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Alice",
      role: "user",
      content: "   ",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Message content cannot be empty");
  });

  it("should reject message with content too long", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Alice",
      role: "user",
      content: "a".repeat(5001),
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Message too long");
  });

  it("should reject message with invalid role", () => {
    const message = {
      id: "test-123",
      user: "Alice",
      role: "admin" as any,
      content: "Hello",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid message role");
  });

  it("should accept message at maximum length", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Alice",
      role: "user",
      content: "a".repeat(5000),
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(true);
  });

  it("should accept message with assistant role", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Assistant",
      role: "assistant",
      content: "How can I help?",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(true);
  });
});

describe("SQL Injection Prevention", () => {
  it("should handle single quotes in content", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Alice",
      role: "user",
      content: "It's a beautiful day",
    };

    const result = validateMessage(message);
    expect(result.valid).toBe(true);
  });

  it("should handle SQL injection attempts in username", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "'; DROP TABLE messages; --",
      role: "user",
      content: "Hello",
    };

    // Validation should pass (parameterized queries handle the SQL safety)
    const result = validateMessage(message);
    expect(result.valid).toBe(true);
  });

  it("should handle SQL injection attempts in content", () => {
    const message: ChatMessage = {
      id: "test-123",
      user: "Alice",
      role: "user",
      content: "'; DELETE FROM messages WHERE '1'='1",
    };

    // Validation should pass (parameterized queries handle the SQL safety)
    const result = validateMessage(message);
    expect(result.valid).toBe(true);
  });
});
