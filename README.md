# Signal - Event Notification System

A Bun-based event notification system with web push capabilities.

## Features

- Event management (CRUD)
- Scheduled notifications
- Web push notifications
- User authentication
- PostgreSQL database with Prisma ORM
- Queue system for reliable notification delivery
- Recurring events support

## Docker Deployment

### Quick Start

The system requires two containers to function properly:

1. **API Server** - Handles HTTP requests and API endpoints
2. **Worker** - Processes background tasks (scheduled notifications, recurring events)

Run both containers with these commands:

```bash
# Start the API server
docker run -d \
  --name signal-api \
  --env-file .env \
  --network host \
  --restart unless-stopped \
  ghcr.io/xg4/signal:latest run start

# Start the background worker
docker run -d \
  --name signal-worker \
  --env-file .env \
  --network host \
  --restart unless-stopped \
  ghcr.io/xg4/signal:latest run start:worker
```

## Tech Stack

- **Runtime**: Bun
- **Backend Framework**: Hono.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT
- **Queue System**: BullMQ + Redis
- **Notifications**: web-push
- **Language**: TypeScript

## Prerequisites

- Bun 1.x
- PostgreSQL
- Redis

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/xg4/signal.git
   cd signal
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.template .env
   ```

   Edit the `.env` file with your configuration.

4. Generate VAPID keys for web push:

   ```bash
   npx web-push generate-vapid-keys
   ```

   Add the generated keys to your `.env` file.

5. Set up the database:
   ```bash
   npm run generate # Generate migration files
   npm run migrate # Apply migrations
   ```

## Development

Start the development server:

```bash
npm run dev
```

## Building for Production

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Docker Deployment

Build the Docker image:

```bash
docker build -t signal-app .
```

## API Endpoints

### Authentication

- `POST /api/register` - Register a new user
- `POST /api/login` - Login a user
- `GET /api/me` - userRequired - Get current user info

### Events

- `GET /api/events` - Get all events for current user
- `GET /api/events/:id` - Get a specific event
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/batch` - Batch import events

### Subscriptions

- `POST /api/subscriptions` - Create a new subscription
- `DELETE /api/subscriptions/:id` - Delete a subscription by ID
- `GET /api/subscriptions` - Get all subscriptions for current user

## Testing Web Push

You can test web push notifications using tools like:

- [Push Companion](https://web-push-codelab.glitch.me/)
- [Browser built-in Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

## License

MIT
