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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { room } = useParams();

  const socket = usePartySocket({
    party: "chat",
    room,
    onOpen: () => {
      setConnectionStatus("connected");
      setError(null);
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
                  }
                : m,
            ),
          );
        } else if (message.type === "all") {
          setMessages(message.messages);
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

      {/* Messages */}
      {messages.map((message) => (
        <div key={message.id} className="row message">
          <div className="two columns user">{message.user}</div>
          <div className="ten columns">{message.content}</div>
        </div>
      ))}
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
          };

          setMessages((messages) => [...messages, chatMessage]);

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
