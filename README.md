# Northbound TCG

Website for the independent Northbound TCG playgroup for Riftbound. It includes a public landing page, a shared event calendar, and a protected administration area for managing events.

Northbound TCG is not officially affiliated with Riftbound or its rights holders.

## Features

- Public team and information page
- Calendar with upcoming events
- Password-protected administration area for creating and deleting events
- MySQL database for event data
- “Hosted by UDS-Solutions.de” notice in the footer

## Technology

- Node.js 20 or later
- Express
- MySQL
- Vite
- HTML, CSS, and JavaScript

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example configuration and enter the values for your local database and administrator account:

   ```bash
   copy .env.example .env
   ```

3. Generate a password hash and enter it as `ADMIN_PASSWORD_HASH` in `.env`:

   ```bash
   npm run hash-password -- YOUR_SECURE_PASSWORD
   ```

4. Create the database tables:

   ```bash
   npm run migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   The website is then available at `http://127.0.0.1:3000`. The administration area is located at `http://127.0.0.1:3000/admin.html`.

The server also checks and creates the schema from `database/schema.sql` when it starts.

## Configuration

Create `.env` locally and do not commit it. Use `.env.example` as a template.

| Variable | Description |
| --- | --- |
| `PORT` | Web server port; defaults to `3000` |
| `MYSQL_HOST` | MySQL host |
| `MYSQL_PORT` | MySQL port; defaults to `3306` |
| `MYSQL_DATABASE` | Database name |
| `MYSQL_USER` | MySQL username |
| `MYSQL_PASSWORD` | MySQL password |
| `ADMIN_USERNAME` | Username for the administration area |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the administrator password |
| `SESSION_COOKIE_SECURE` | Set to `true` when using HTTPS in production |

## Production and deployment

Create a production build:

```bash
npm run build
```

Start the Node server in production mode:

```bash
NODE_ENV=production npm start
```

In Windows PowerShell:

```powershell
$env:NODE_ENV = "production"
npm.cmd start
```

In production mode, Express serves the generated files from `dist/` and provides the calendar API. Plesk therefore requires the Node.js extension and an accessible MySQL database. Configure environment variables in the hosting environment; never commit credentials to the repository.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the server and Vite development environment |
| `npm run build` | Creates the production build in `dist/` |
| `npm start` | Starts the server |
| `npm run migrate` | Creates or updates the database schema |
| `npm run hash-password -- PASSWORD` | Generates a bcrypt hash for the administrator password |

## Project structure

```text
├── admin.html / admin.js / admin.css  # Administration area
├── calendar.html / calendar.js         # Public calendar
├── database/schema.sql                 # MySQL schema
├── scripts/                            # Migration and password hashing
├── index.html / script.js / style.css  # Landing page and shared styling
├── server.js                           # Express server and API
└── .env.example                        # Configuration template
```
