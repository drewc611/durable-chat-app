import { describe, it, expect } from "vitest";
import { names, type ChatMessage, type Message } from "./shared";

describe("Shared Types and Constants", () => {
  describe("names array", () => {
    it("should contain names", () => {
      expect(names).toBeDefined();
      expect(names.length).toBeGreaterThan(0);
    });

    it("should contain only strings", () => {
      names.forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it("should contain expected names", () => {
      expect(names).toContain("Alice");
      expect(names).toContain("Bob");
      expect(names).toContain("Charlie");
    });

    it("should have at least 20 names for variety", () => {
      expect(names.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe("ChatMessage type", () => {
    it("should accept valid user message", () => {
      const message: ChatMessage = {
        id: "123",
        content: "Hello",
        user: "Alice",
        role: "user",
      };

      expect(message.id).toBe("123");
      expect(message.content).toBe("Hello");
      expect(message.user).toBe("Alice");
      expect(message.role).toBe("user");
    });

    it("should accept valid assistant message", () => {
      const message: ChatMessage = {
        id: "456",
        content: "How can I help?",
        user: "Assistant",
        role: "assistant",
      };

      expect(message.role).toBe("assistant");
    });
  });

  describe("Message type", () => {
    it("should accept add message type", () => {
      const message: Message = {
        type: "add",
        id: "123",
        content: "Hello",
        user: "Alice",
        role: "user",
      };

      expect(message.type).toBe("add");
    });

    it("should accept update message type", () => {
      const message: Message = {
        type: "update",
        id: "123",
        content: "Updated content",
        user: "Alice",
        role: "user",
      };

      expect(message.type).toBe("update");
    });

    it("should accept all message type", () => {
      const message: Message = {
        type: "all",
        messages: [
          {
            id: "123",
            content: "Hello",
            user: "Alice",
            role: "user",
          },
        ],
      };

      expect(message.type).toBe("all");
      expect(message.messages).toHaveLength(1);
    });

    it("should accept error message type", () => {
      const message: Message = {
        type: "error",
        error: "Something went wrong",
      };

      expect(message.type).toBe("error");
      expect(message.error).toBe("Something went wrong");
    });
  });
});
