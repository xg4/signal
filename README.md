# Signal - Event Notification System

A Node.js-based event notification system with web push capabilities.

## Features

- Event management (CRUD)
- Scheduled notifications
- Web push notifications
- User authentication
- PostgreSQL database with Drizzle ORM

## Tech Stack

- **Backend Framework**: Hono.js
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: JWT
- **Scheduling**: cron
- **Notifications**: web-push
- **Language**: TypeScript

## Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

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

Run the container:

```bash
docker run -p 3000:3000 --env-file .env signal-app
```

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login a user
- `GET /api/users/me` - Get current user info

### Events

- `GET /api/events` - Get all events for current user
- `GET /api/events/:id` - Get a specific event
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/batch` - Batch import events

### Subscriptions

- `GET /api/subscriptions` - Get all subscriptions for current user
- `POST /api/subscriptions` - Create a new subscription
- `DELETE /api/subscriptions` - Delete a subscription

## Testing Web Push

You can test web push notifications using tools like:

- [Push Companion](https://web-push-codelab.glitch.me/)
- [Browser built-in Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

## License

MIT
