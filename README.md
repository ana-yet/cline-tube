# CineTube

Movie and series rating portal built with Next.js, Express, Prisma, and PostgreSQL.

## Live app

| | URL |
|---|---|
| Frontend | Deploy on Vercel (see below) |
| Backend API | Deploy on Render — Express needs a long-running server |

After deploy, set `NEXT_PUBLIC_API_URL` on Vercel to your Render API URL (e.g. `https://cinetube-api.onrender.com/api`).

## Admin login (after seed)

- Email: `admin@cinetube.com`
- Password: `Admin123!`

## Local setup

```bash
npm install
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
cd ../frontend && npm install
```

Copy env files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Run backend (`cd backend && npm run dev`) and frontend (`cd frontend && npm run dev`).

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

Put the `whsec_...` value in `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

## Deploy frontend on Vercel

1. Push this repo to GitHub.
2. Import the project at [vercel.com](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Add env var: `NEXT_PUBLIC_API_URL` = your backend `/api` URL.
5. Deploy.

CLI option:

```bash
cd frontend
npx vercel
```

## Deploy backend on Render

Use the included `render.yaml` or create a web service with:

- Root: `backend`
- Build: `npm install && npm run build && npx prisma generate --schema=../prisma/schema.prisma`
- Start: `node dist/server.js`

Then run migrations against production:

```bash
cd backend
npx prisma migrate deploy --schema=../prisma/schema.prisma
```

Add a Stripe webhook pointing to `https://YOUR-API.onrender.com/api/webhooks/stripe`.

## Scripts

**Backend:** `npm run dev`, `npm run build`, `npm run prisma:seed`  
**Frontend:** `npm run dev`, `npm run build`

## Stack

Next.js, Express, Prisma, PostgreSQL, Stripe, Cloudinary, JWT auth
