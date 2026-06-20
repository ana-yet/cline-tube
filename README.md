# 🎬 CineTube — Movie & Series Rating & Streaming Portal

A full-stack web application for discovering, rating, and reviewing movies and series.

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend  | Node.js, Express.js, Prisma ORM, PostgreSQL     |
| Auth     | JWT + Refresh Token Rotation + RBAC             |
| Payments | Stripe Subscriptions (FREE / MONTHLY / YEARLY)  |

## Project Structure

```
cline-tube/
├── backend/          # Express API server
│   └── src/
│       ├── config/   # Environment, Prisma, CORS
│       ├── middlewares/ # Auth, validation, error handling
│       ├── routes/   # API route registry
│       ├── types/    # TypeScript type definitions
│       └── utils/    # Errors, JWT, response helpers
├── frontend/         # Next.js application
│   └── src/
│       ├── app/      # App Router pages & layouts
│       ├── components/
│       ├── hooks/    # TanStack Query hooks
│       ├── lib/      # Axios, query client, validations
│       ├── providers/# Auth, Query providers
│       └── types/    # Shared TypeScript types
└── prisma/           # Database schema & seed
    ├── schema.prisma
    └── seed.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Installation

```bash
# Install root Prisma dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Set up environment variables
cp .env.example .env           # Root — DATABASE_URL for Prisma
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Run database migrations
cd backend && npm run prisma:migrate

# Seed the database
npm run prisma:seed

# Start development servers
npm run dev    # Backend on http://localhost:5000
cd ../frontend && npm run dev  # Frontend on http://localhost:3000
```

## Development Scripts

### Backend

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start dev server with hot-reload |
| `npm run build`         | Compile TypeScript               |
| `npm run prisma:studio` | Open Prisma Studio GUI           |

### Frontend

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start Next.js dev server |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
