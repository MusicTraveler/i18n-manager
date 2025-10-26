# i18n Manager

A powerful application for managing internationalization (i18n) messages with CRUD operations, powered by Cloudflare D1, Workers AI, and BlueprintJS.

## Features

- ✨ **Full CRUD operations** - Create, Read, Update, and Delete i18n messages
- 🌍 **Auto-translation** - Leverage Cloudflare Workers AI for automatic translations
- 📊 **Table view** - View all messages in an organized table
- 🔍 **Filtering** - Filter messages by key or locale
- 🎨 **BlueprintJS UI** - Modern, professional interface

## Tech Stack

- **Frontend:** Next.js 15 with React 19
- **Data Fetching:** SWR
- **UI Components:** BlueprintJS
- **ORM:** Drizzle ORM
- **Database:** Cloudflare D1
- **AI Translations:** Cloudflare Workers AI
- **Deployment:** Cloudflare Workers

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Wrangler CLI installed globally

### Installation

1. Install dependencies:

```bash
pnpm install
```

### Database Setup

1. Create a D1 database:

```bash
wrangler d1 create i18n-messages-db
```

2. Update the `database_id` in `wrangler.jsonc` with the ID returned from the previous command.

3. Run the Drizzle migration to create the schema:

```bash
pnpm drizzle-kit push
```

Or alternatively, run the SQL migration:

```bash
wrangler d1 execute i18n-messages-db --file=./migrations/0001_initial_schema.sql
```

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Production Build

Build and deploy to Cloudflare:

```bash
# Build the application
pnpm build

# Preview the build locally
pnpm preview

# Deploy to Cloudflare
pnpm deploy
```

## Usage

### Adding Messages

1. Click the "Add Message" button
2. Enter the message key (e.g., `welcome.message`)
3. Enter the locale (e.g., `en`, `es`, `fr`)
4. Enter the message text
5. Click "Create"

### Translating Messages

1. Find a message you want to translate in the table
2. Click the translate icon (🌐) on that message
3. Enter the target locale (e.g., `es`, `fr`, `de`)
4. The AI will automatically translate the message and save it

### Editing Messages

1. Click the edit icon (✏️) on any message
2. Modify the message text
3. Click "Update"

### Filtering

Use the filter inputs at the top to filter messages by:
- **Key**: Filter by message key
- **Locale**: Filter by locale code

### Deleting Messages

1. Click the delete icon (🗑️) on any message
2. Confirm the deletion

## API Endpoints

- `GET /api/messages` - Get all messages (supports `?key=` and `?locale=` query params)
- `POST /api/messages` - Create a new message
- `PUT /api/messages` - Update an existing message
- `DELETE /api/messages?id=<id>` - Delete a message
- `POST /api/messages/translate` - Translate a message using AI

## Database Schema

The application uses Drizzle ORM with a single table `messages`. The schema is defined in `src/db/schema.ts`:

```typescript
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  locale: text("locale").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$default(() => new Date()),
});
```

### Nested Key Support

The schema supports nested JSON structures using dot notation. For example:
- Key: `common.loading` → JSON: `{ "common": { "loading": "Loading..." } }`
- Key: `navigation.home` → JSON: `{ "navigation": { "home": "Home" } }`

When you export via curl, the flat key-value pairs are automatically transformed into nested JSON objects.

### Translation Completeness

The application ensures all languages have the same structure:

**Visual Indicators in UI:**
- **Dashboard cards** show translation completeness per locale (green = 100%, red = <50%, orange = 50-99%)
- **Missing badges** on keys show how many locales are missing that translation
- **Percentage scores** show which languages need work

**Rules:**
- All keys must exist across all locales
- The UI highlights incomplete translations
- Export API returns nested JSON maintaining structure consistency

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
