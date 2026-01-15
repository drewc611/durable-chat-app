import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";
import { nanoid } from "nanoid";

import { names, type ChatMessage, type Message } from "../shared";

// Client-side validation constants (should match server)
const MAX_MESSAGE_LENGTH = 5000;

function App() {
  const [name] = useState(
    () => names[Math.floor(Math.random() * names.length)],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "reconnecting"
  >("connecting");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { room } = useParams();

  const socket = usePartySocket({
    party: "chat",
    room,
    onOpen: () => {
      setConnectionStatus("connected");
      setError(null);
      // Send user_joined message
      socket.send(
        JSON.stringify({
          type: "user_joined",
          user: name,
        } satisfies Message),
      );
    },
    onClose: () => {
      setConnectionStatus("disconnected");
    },
    onError: () => {
      setConnectionStatus("reconnecting");
      setError("Connection error. Attempting to reconnect...");
    },
    onMessage: (evt) => {
      try {
        const message = JSON.parse(evt.data as string) as Message;

        if (message.type === "error") {
          setError(message.error);
          // Clear error after 5 seconds
          setTimeout(() => setError(null), 5000);
          return;
        }

        if (message.type === "add") {
          const foundIndex = messages.findIndex((m) => m.id === message.id);
          if (foundIndex === -1) {
            // probably someone else who added a message
            setMessages((messages) => [
              ...messages,
              {
                id: message.id,
                content: message.content,
                user: message.user,
                role: message.role,
                timestamp: message.timestamp,
              },
            ]);
          } else {
            // this usually means we ourselves added a message
            // and it was broadcasted back
            // so let's replace the message with the new message
            setMessages((messages) => {
              return messages
                .slice(0, foundIndex)
                .concat({
                  id: message.id,
                  content: message.content,
                  user: message.user,
                  role: message.role,
                  timestamp: message.timestamp,
                })
                .concat(messages.slice(foundIndex + 1));
            });
          }
        } else if (message.type === "update") {
          setMessages((messages) =>
            messages.map((m) =>
              m.id === message.id
                ? {
                    id: message.id,
                    content: message.content,
                    user: message.user,
                    role: message.role,
                    timestamp: message.timestamp,
                  }
                : m,
            ),
          );
        } else if (message.type === "delete") {
          setMessages((messages) =>
            messages.filter((m) => m.id !== message.id),
          );
        } else if (message.type === "all") {
          setMessages(message.messages);
        } else if (message.type === "typing") {
          if (message.user !== name) {
            setTypingUsers((prev) => {
              const newSet = new Set(prev);
              if (message.isTyping) {
                newSet.add(message.user);
              } else {
                newSet.delete(message.user);
              }
              return newSet;
            });
            // Auto-clear typing indicator after 3 seconds
            if (message.isTyping) {
              setTimeout(() => {
                setTypingUsers((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(message.user);
                  return newSet;
                });
              }, 3000);
            }
          }
        } else if (message.type === "user_joined") {
          if (message.user !== name) {
            setOnlineUsers((prev) => new Set(prev).add(message.user));
          }
        } else if (message.type === "user_left") {
          setOnlineUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(message.user);
            return newSet;
          });
        }
      } catch (err) {
        console.error("Error parsing message:", err);
        setError("Error processing message from server");
      }
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Validate message before sending
  const validateMessageContent = (content: string): string | null => {
    if (!content.trim()) {
      return "Message cannot be empty";
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`;
    }
    return null;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 1 minute ago
    if (diff < 60000) {
      return "Just now";
    }
    // If less than 1 hour ago
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    // If today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // Otherwise show date
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping: boolean) => {
    try {
      socket.send(
        JSON.stringify({
          type: "typing",
          user: name,
          isTyping,
        } satisfies Message),
      );
    } catch (err) {
      console.error("Error sending typing indicator:", err);
    }
  };

  // Delete message
  const deleteMessage = (messageId: string) => {
    try {
      socket.send(
        JSON.stringify({
          type: "delete",
          id: messageId,
        } satisfies Message),
      );
    } catch (err) {
      console.error("Error deleting message:", err);
      setError("Failed to delete message");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="chat container">
      {/* Connection Status Indicator */}
      <div
        className="row"
        style={{
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "4px",
          backgroundColor:
            connectionStatus === "connected"
              ? "#d4edda"
              : connectionStatus === "connecting" ||
                  connectionStatus === "reconnecting"
                ? "#fff3cd"
                : "#f8d7da",
          color:
            connectionStatus === "connected"
              ? "#155724"
              : connectionStatus === "connecting" ||
                  connectionStatus === "reconnecting"
                ? "#856404"
                : "#721c24",
        }}
      >
        <strong>Status:</strong>{" "}
        {connectionStatus === "connected" && "Connected"}
        {connectionStatus === "connecting" && "Connecting..."}
        {connectionStatus === "reconnecting" && "Reconnecting..."}
        {connectionStatus === "disconnected" && "Disconnected"}
        {onlineUsers.size > 0 && (
          <span style={{ marginLeft: "10px" }}>
            • {onlineUsers.size + 1} online
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="row"
          style={{
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "4px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            border: "1px solid #f5c6cb",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Online Users */}
      {onlineUsers.size > 0 && (
        <div
          className="row"
          style={{
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "4px",
            backgroundColor: "#e7f3ff",
            border: "1px solid #b8daff",
            fontSize: "14px",
          }}
        >
          <strong>Online:</strong> {name} (you),{" "}
          {Array.from(onlineUsers).join(", ")}
        </div>
      )}

      {/* Messages */}
      <div style={{ marginBottom: "60px" }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className="row message"
            style={{
              marginBottom: "10px",
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: message.user === name ? "#e3f2fd" : "#f5f5f5",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  {message.user}
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginLeft: "8px",
                      fontWeight: "normal",
                    }}
                  >
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <div style={{ wordBreak: "break-word" }}>{message.content}</div>
              </div>
              {message.user === name && (
                <button
                  onClick={() => deleteMessage(message.id)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    marginLeft: "8px",
                  }}
                  title="Delete message"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div
          style={{
            padding: "10px",
            fontStyle: "italic",
            color: "#666",
            fontSize: "14px",
          }}
        >
          {Array.from(typingUsers).join(", ")}{" "}
          {typingUsers.size === 1 ? "is" : "are"} typing...
        </div>
      )}

      <div ref={messagesEndRef} />

      {/* Message Input Form */}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const content = e.currentTarget.elements.namedItem(
            "content",
          ) as HTMLInputElement;

          // Client-side validation
          const validationError = validateMessageContent(content.value);
          if (validationError) {
            setError(validationError);
            setTimeout(() => setError(null), 3000);
            return;
          }

          // Check connection status
          if (connectionStatus !== "connected") {
            setError("Cannot send message: Not connected to server");
            setTimeout(() => setError(null), 3000);
            return;
          }

          const chatMessage: ChatMessage = {
            id: nanoid(8),
            content: content.value,
            user: name,
            role: "user",
            timestamp: Date.now(),
          };

          setMessages((messages) => [...messages, chatMessage]);

          // Send stop typing indicator
          sendTypingIndicator(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }

          try {
            socket.send(
              JSON.stringify({
                type: "add",
                ...chatMessage,
              } satisfies Message),
            );
            content.value = "";
          } catch (err) {
            console.error("Error sending message:", err);
            setError("Failed to send message");
            setTimeout(() => setError(null), 3000);
          }
        }}
      >
        <input
          type="text"
          name="content"
          className="ten columns my-input-text"
          placeholder={`Hello ${name}! Type a message...`}
          autoComplete="off"
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={connectionStatus !== "connected"}
          onInput={() => {
            // Send typing indicator
            sendTypingIndicator(true);

            // Clear existing timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing after 2 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
              sendTypingIndicator(false);
            }, 2000);
          }}
        />
        <button
          type="submit"
          className="send-message two columns"
          disabled={connectionStatus !== "connected"}
        >
          Send
        </button>
      </form>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
      <Route path="/:room" element={<App />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </BrowserRouter>,
);
