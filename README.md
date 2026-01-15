# Durable Chat App

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/durable-chat-template)

![Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/da00d330-9a3b-40a2-e6df-b08813fb7200/public)

<!-- dash-content-start -->

A **production-ready**, secure real-time chat application with comprehensive features including message timestamps, typing indicators, online user presence, and message deletion. Built with [Durable Objects](https://developers.cloudflare.com/durable-objects/) and [PartyKit](https://www.partykit.io/).

Going to the [demo website](https://durable-chat-template.templates.workers.dev) puts you into a unique chat room based on the ID in the URL. Share that ID with others to chat with them!

## ✨ Features

### Core Chat Features
- **Real-time messaging** with WebSocket connections
- **Message persistence** using Durable Object SQL Storage
- **Message timestamps** with smart formatting (relative and absolute times)
- **Message deletion** - users can delete their own messages
- **Auto-scroll** to newest messages
- **Message history** (up to 1000 messages per room)

### User Experience
- **Typing indicators** - see when others are typing
- **Online user list** - see who's in the chat room
- **Connection status indicator** - know your connection state at all times
- **Automatic reconnection** on connection failures
- **User join/leave notifications**
- **Mobile-responsive design** with proper word wrapping
- **Visual message distinction** - your messages vs. others' messages

### Security & Stability
- **SQL injection protection** with parameterized queries
- **Comprehensive input validation** (message length, username, content)
- **Rate limiting** (10 messages per 10 seconds per connection)
- **Bounded memory usage** (automatic pruning of old messages)
- **Error handling** throughout server and client code
- **Client-side validation** matching server requirements

### Code Quality
- **TypeScript** with strict mode enabled
- **ESLint** configured for code consistency
- **Prettier** for consistent formatting
- **Comprehensive test suite** (26 tests, all passing)
- **Test coverage** for validation and security

## How It Works

Users are assigned their own chat room when they first visit the page, and can talk to others by sharing their room URL. When someone joins the chat room, a WebSocket connection is opened with a [Durable Object](https://developers.cloudflare.com/durable-objects/) that stores and synchronizes the chat history.

The Durable Object instance that manages the chat room runs in one location, and handles all incoming WebSocket connections. Chat messages are stored and retrieved using the [Durable Object SQL Storage API](https://developers.cloudflare.com/durable-objects/api/sql-storage/). When a new user joins the room, the existing chat history is retrieved from the Durable Object for that room. When a user sends a chat message, the message is stored in the Durable Object for that room and broadcast to all other users in that room via WebSocket connection. This template uses the [PartyKit Server API](https://docs.partykit.io/reference/partyserver-api/) to simplify the connection management logic, but could also be implemented using Durable Objects on their own.

<!-- dash-content-end -->

## 🚀 Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/durable-chat-template
```

A live public deployment of this template is available at [https://durable-chat-template.templates.workers.dev](https://durable-chat-template.templates.workers.dev)

## 📋 Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run locally for development:**
   ```bash
   npm run dev
   ```
   This starts the Wrangler dev server with hot reload.

3. **Run tests:**
   ```bash
   npm test           # Run tests in watch mode
   npm run test:run   # Run tests once
   npm run test:ui    # Run tests with UI
   ```

4. **Check code quality:**
   ```bash
   npm run lint       # Check for lint errors
   npm run format     # Format code with Prettier
   ```

5. **Deploy to Cloudflare:**
   ```bash
   npm run deploy
   ```

6. **Monitor your deployment:**
   ```bash
   npx wrangler tail
   ```

## 🛡️ Security Features

This application implements multiple layers of security:

### SQL Injection Protection
All database queries use **parameterized queries** instead of string interpolation, preventing SQL injection attacks.

### Input Validation
- Message content: max 5000 characters, cannot be empty
- Usernames: max 50 characters, must be provided
- Message roles: only "user" or "assistant" allowed
- All validation on both client and server sides

### Rate Limiting
- 10 messages per 10-second window per connection
- Prevents message flooding and abuse
- Returns clear error messages to users

### Memory Management
- Maximum 1000 messages per chat room
- Automatic pruning of oldest messages
- Prevents unbounded memory growth

## 🏗️ Architecture

### Tech Stack
- **Runtime:** Cloudflare Workers
- **State Management:** Durable Objects with SQL Storage
- **Frontend:** React 18 with TypeScript
- **WebSocket:** PartyKit Server API
- **Build Tool:** esbuild
- **Testing:** Vitest with happy-dom
- **Code Quality:** ESLint + Prettier

### Data Flow
1. User opens chat room URL → unique Durable Object instance
2. WebSocket connection established
3. Server sends chat history from SQL storage
4. User sends message → validated → saved to SQL → broadcast to all
5. All clients receive update in real-time

### Message Types
- `add` - New message
- `update` - Edit existing message
- `delete` - Remove message
- `typing` - Typing indicator
- `user_joined` - User joined room
- `user_left` - User left room
- `error` - Error message from server
- `all` - Full message history on connect

## 📝 Development Commands

```bash
# Code Quality
npm run lint           # Check code with ESLint
npm run lint:fix       # Fix auto-fixable issues
npm run format         # Format all code with Prettier
npm run format:check   # Check formatting without changes

# Testing
npm test               # Run tests in watch mode
npm run test:run       # Run all tests once
npm run test:ui        # Open Vitest UI
npm run test:coverage  # Run tests with coverage report

# Type Checking
npm run check          # Type check client & server, dry-run deploy

# Deployment
npm run dev            # Start local development server
npm run deploy         # Deploy to Cloudflare Workers
```

## 🔧 Configuration

### Limits (configurable in `src/server/index.ts`)
- `MAX_MESSAGES`: 1000 messages per room
- `MAX_MESSAGE_LENGTH`: 5000 characters
- `MAX_USERNAME_LENGTH`: 50 characters
- `RATE_LIMIT_MESSAGES`: 10 messages per window
- `RATE_LIMIT_WINDOW_MS`: 10000ms (10 seconds)

### Database Schema
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  user TEXT,
  role TEXT,
  content TEXT,
  timestamp INTEGER
)
```

## 🧪 Testing

The project includes comprehensive tests covering:
- Message validation (empty, too long, invalid fields)
- SQL injection prevention
- Type checking for all message types
- Security edge cases

Run tests with:
```bash
npm test
```

All 26 tests pass with full type safety.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- Code is formatted (`npm run format`)
- No lint errors (`npm run lint`)
- TypeScript compiles (`npm run check`)
