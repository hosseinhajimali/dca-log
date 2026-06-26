# DCAlog

A self-hosted dollar-cost averaging tracker. Plan your recurring buys across multiple assets, set buying and sell rules, track every transaction, and watch your goals and portfolio projections, all running locally on your own machine.

DCAlog is built to run as a single-user app you host yourself. No account, no cloud, no subscription. Clone it, start it, and your data stays in your own database.

## What it does

- Track real buy and sell transactions across crypto, metals, stocks, and ETFs.
- Build DCA plans with multi-asset allocations and configurable frequency.
- Define buying rule sets (for example, buy more on a drawdown) and sell rule sets (take profit at a target).
- Set goals: accumulation targets, portfolio value, or investment commitments.
- See portfolio projections, a tax view, and a strategy simulator.
- Live prices and FX from public APIs (CoinGecko, Binance, Frankfurter) plus a Fear and Greed indicator.
- Export and import all your data as JSON for backup or migration.

## Stack

Frontend: Next.js (App Router) + TypeScript, Tailwind CSS, Zustand, TanStack Query, Recharts.

Backend: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, JWT auth (optional Google OAuth), node-cron.

## Quickstart (local, no login)

Prerequisites: Node.js 20+ and Docker Desktop.

```bash
# 1. Clone and install
git clone <your-fork-url> dcalog
cd dcalog
npm install

# 2. Create the server env file
cp server/.env.example server/.env
#    Then set JWT_SECRET to any long random string.
#    LOCAL_MODE=true is the default, so there is no login.

# 3. Start PostgreSQL (Docker) and apply the schema
npm run db:up
npm run db:migrate

# 4. Run both the frontend and backend
npm run dev
```

Open http://localhost:3000 and you go straight into the app. The backend runs on http://localhost:3001.

### Local mode

With `LOCAL_MODE=true` (the default in `.env.example`), DCAlog skips login entirely and runs as a single shared local user. This is the recommended way to run it for yourself.

To run it as a multi-user app instead, set `LOCAL_MODE=false`. Then users sign in with email and password, or with Google if you configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Bringing in your data

Use the in-app Export to download a JSON backup, and Import to restore it. Import reassigns everything to the current user and remaps IDs, so a backup taken from one instance loads cleanly into another. Price and FX caches are not exported. they rebuild automatically on first run.

## Optional integrations

All of these are off by default and the app runs fine without them.

- CoinGecko: the free public API works with no key. Set `COINGECKO_API_KEY` only if you have a Pro or Demo key and want higher rate limits.
- Google OAuth: only used when `LOCAL_MODE=false`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`.
- Telegram notifications: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID` to receive reminders, otherwise notifications are skipped silently.

## Project structure

```
dcalog/
├── client/                  # Next.js frontend
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # Shared UI
│       ├── views/           # Page-level components
│       ├── store/           # Zustand store
│       ├── hooks/           # Custom hooks
│       └── lib/             # API and query clients
└── server/                  # Express backend
    ├── src/
    │   ├── controllers/     # Route handlers
    │   ├── routes/          # Express routers
    │   ├── middleware/      # Auth, error handling
    │   ├── services/        # Business logic, cron jobs
    │   └── lib/             # Prisma client, local mode
    └── prisma/
        ├── schema.prisma    # Database schema
        └── migrations/      # Single squashed init
```

## Useful scripts

From the repo root:

| Command | Description |
|---|---|
| `npm run dev` | Start frontend and backend together |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | Backend only |
| `npm run db:up` | Start the PostgreSQL container |
| `npm run db:down` | Stop the container |
| `npm run db:reset` | Wipe the database volume and restart it |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

## Optional: deploy it

DCAlog also runs as a normal client plus server deployment. Host the Next.js client (for example on Vercel) and the Express server (for example on Render or any Node host), point `DATABASE_URL` at a hosted Postgres, set `LOCAL_MODE=false`, and configure `CLIENT_ORIGIN` and `NEXT_PUBLIC_API_URL` to your domains.

## License

MIT. See [LICENSE](LICENSE).
