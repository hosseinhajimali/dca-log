# Setup Guide

For first-time setup, follow the Quickstart in the [README](README.md). This file is a quick reference for day-to-day development.

## Prerequisites
- Node.js 20+
- Docker Desktop (running)

## First time

```bash
npm install
cp server/.env.example server/.env   # then set JWT_SECRET
npm run db:up                         # start PostgreSQL (Docker)
npm run db:migrate                    # create the tables
npm run dev                           # start frontend + backend
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health
- Prisma Studio (DB browser): `npm run db:studio`

By default `LOCAL_MODE=true`, so there is no login. you go straight into the app.

## Daily development

```bash
npm run db:up    # start postgres if it is not already running
npm run dev      # start both servers
```

## Useful commands

```bash
npm run db:studio        # visual database browser
npm run db:migrate       # apply new migrations after a schema change
npm run db:reset         # wipe the database volume and start fresh
npm run dev:server       # backend only
npm run dev:client       # frontend only
```
