# DCAlog

Track your dollar-cost averaging strategy, monitor buying opportunities, and know when to take profit, all in one place.

**Live:** [dcalog.com](https://dcalog.com)

---

## Stack

**Frontend**
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Zustand (state management)
- TanStack Query (data fetching)
- Recharts (charts)
- Axios

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- Passport.js (Google OAuth)
- JWT authentication
- node-cron (price refresh every 5 minutes)

**Infrastructure**
- Frontend → Vercel
- Backend → Render (Starter, $7/mo)
- Database → Neon (free tier)

---

## Local Development

### Prerequisites
- Node.js 18+
- A running PostgreSQL database (or use the Neon connection string)

### 1. Clone and install

```bash
git clone https://github.com/hosseinhajimali/dca-log.git
cd dca-log
npm install
```

### 2. Configure environment variables

**`server/.env`**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_long_random_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
CLIENT_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**`client/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Set up the database

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

### 4. Run

From the repo root:

```bash
npm run dev
```

This starts both servers concurrently:
- Frontend → http://localhost:3000
- Backend → http://localhost:3001

---

## Project Structure

```
dca-log/
├── client/                  # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Shared UI components
│   │   ├── views/           # Page-level components
│   │   ├── store/           # Zustand store
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API client, query client
│   │   └── types/           # TypeScript types
│   └── public/              # Static assets
│
└── server/                  # Express backend
    ├── src/
    │   ├── controllers/     # Route handlers
    │   ├── routes/          # Express routers
    │   ├── middleware/      # Auth, error handling
    │   ├── services/        # Business logic, cron jobs
    │   └── lib/             # Prisma client
    └── prisma/
        ├── schema.prisma    # Database schema
        └── migrations/      # Migration history
```

---

## Database Migrations

```bash
# Create a new migration (development)
cd server
npx prisma migrate dev --name describe_your_change

# Apply migrations (production)
DATABASE_URL="..." npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npm run db:studio
```

---

## Deployment

### Frontend (Vercel)
- Connected to GitHub `main` branch, auto-deploys on every push
- Environment variable: `NEXT_PUBLIC_API_URL=https://dcalog-server.onrender.com`

### Backend (Render)
- Connected to GitHub `main` branch, auto-deploys on every push
- Root directory: `server`
- Build command: `npm install --include=dev && npx prisma generate && npm run build`
- Start command: `npm run start`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `CLIENT_ORIGIN`, `NODE_ENV`

### Google OAuth (Google Cloud Console)
- Authorized JavaScript origins: `https://dcalog.com`
- Authorized redirect URIs: `https://dcalog-server.onrender.com/api/auth/google/callback`

---

## Available Scripts

From repo root:

| Command | Description |
|---|---|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
