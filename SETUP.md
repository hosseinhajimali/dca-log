# myDCA, Setup Guide

## Prerequisites
- Node.js 20+
- Docker Desktop (running)

## First-time setup

```bash
# 1. Install all dependencies
npm install

# 2. Start PostgreSQL in Docker
npm run db:up

# 3. Create .env in server/ (already done, just verify)
cat server/.env

# 4. Run Prisma migrations (creates all DB tables)
npm run db:migrate

# 5. Start both servers (frontend + backend)
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/health
- **Prisma Studio** (DB browser): `npm run db:studio`

## Daily development
```bash
npm run db:up    # start postgres (if not running)
npm run dev      # start both servers
```

## Useful commands
```bash
npm run db:studio        # open Prisma visual DB browser
npm run db:migrate       # run new migrations after schema changes
npm run dev:server       # server only
npm run dev:client       # client only
```
