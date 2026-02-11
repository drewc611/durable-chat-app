# Durable Chat App

## Project Structure

```plaintext
/durable-chat-app
  ├── /client         # Customer-facing web portal
  │   ├── /public      # Static files
  │   └── /src        # Source files
  ├── /admin          # Admin dashboard
  │   ├── /public      # Static files
  │   └── /src        # Source files
  ├── /server         # API server
  │   ├── /routes      # API routes
  │   ├── /models      # Database models
  │   └── /controllers # Business logic
  ├── /config         # Configuration files
  └── /scripts        # Scripts for database migrations and setup
```

## Setup Instructions

1. Clone the repository.
2. Navigate to the `/client` or `/admin` directory as needed.
3. Install dependencies using your package manager (e.g., npm install).
4. Run the development server: `npm start` for client or admin.

## Best Practices
- Use version control for tracking changes.
- Maintain a clean project structure for scalability and maintainability.
- Include README documentation for onboarding new developers.
- Implement testing for critical components and functionalities.
- Utilize environment variables for sensitive information.
