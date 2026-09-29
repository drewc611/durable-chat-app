import {
  type Connection,
  Server,
  type WSMessage,
  routePartykitRequest,
} from "partyserver";

import type { ChatMessage, Message } from "../shared";
import {
  MAX_FRAME_CHARS,
  MAX_STORED_MESSAGES,
  RateLimiter,
  isValidRoomName,
  parseClientMessage,
} from "./validate";

// Close codes in the 4000-4999 range are reserved for applications.
const CLOSE_FRAME_TOO_BIG = 4009;
const CLOSE_RATE_LIMITED = 4029;

type ConnectionState = { user?: string };

export class Chat extends Server<Env> {
  static options = { hibernate: true };

  messages = [] as ChatMessage[];

  // burst of 10 messages, then 2 per second. Held in memory, so it resets if
  // the object is evicted; that only gives a flooder a fresh burst.
  limiter = new RateLimiter(10, 2);

  broadcastMessage(message: Message, exclude?: string[]) {
    this.broadcast(JSON.stringify(message), exclude);
  }

  onStart() {
    // this is where you can initialize things that need to be done before the server starts
    // for example, load previous messages from a database or a service

    // create the messages table if it doesn't exist
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, user TEXT, role TEXT, content TEXT)`,
    );

    // load the messages from the database
    this.messages = this.ctx.storage.sql
      .exec(`SELECT * FROM messages`)
      .toArray() as ChatMessage[];
    this.trimStoredMessages();
  }

  onClose(connection: Connection) {
    this.limiter.forget(connection.id);
  }

  trimStoredMessages() {
    while (this.messages.length > MAX_STORED_MESSAGES) {
      const oldest = this.messages.shift();
      if (oldest) {
        this.ctx.storage.sql.exec(
          "DELETE FROM messages WHERE id = ?",
          oldest.id,
        );
      }
    }
  }

  onConnect(connection: Connection) {
    connection.send(
      JSON.stringify({
        type: "all",
        messages: this.messages,
      } satisfies Message),
    );
  }

  saveMessage(message: ChatMessage) {
    const index = this.messages.findIndex((m) => m.id === message.id);
    if (index === -1) {
      this.messages.push(message);
    } else {
      this.messages[index] = message;
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO messages (id, user, role, content) VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET content = excluded.content`,
      message.id,
      message.user,
      message.role,
      message.content,
    );
    this.trimStoredMessages();
  }

  onMessage(connection: Connection, message: WSMessage) {
    if (typeof message === "string" && message.length > MAX_FRAME_CHARS) {
      connection.close(CLOSE_FRAME_TOO_BIG, "message too big");
      return;
    }
    if (!this.limiter.allow(connection.id)) {
      connection.close(CLOSE_RATE_LIMITED, "rate limited");
      return;
    }

    const parsed = parseClientMessage(message);
    if (!parsed) return;

    // A connection speaks as one user for its lifetime.
    const state = connection.state as ConnectionState | null;
    if (state?.user && state.user !== parsed.user) return;

    const existing = this.messages.find((m) => m.id === parsed.id);
    if (parsed.type === "add" && existing) return;
    if (
      parsed.type === "update" &&
      (!existing || existing.user !== parsed.user)
    ) {
      return;
    }

    if (!state?.user) connection.setState({ user: parsed.user });

    const chatMessage: ChatMessage = {
      id: parsed.id,
      content: parsed.content,
      user: parsed.user,
      role: "user",
    };
    this.saveMessage(chatMessage);
    this.broadcastMessage({ type: parsed.type, ...chatMessage });
  }
}

function rejectBadRoom(_req: Request, lobby: { name: string }) {
  if (!isValidRoomName(lobby.name)) {
    return new Response("Invalid room name", { status: 400 });
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(
        request,
        { ...env },
        { onBeforeConnect: rejectBadRoom, onBeforeRequest: rejectBadRoom },
      )) ||
      env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
