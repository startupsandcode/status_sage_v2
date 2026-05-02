# Vercel Migration Design

**Date:** 2026-05-02
**Status:** Approved

## Overview

Migrate Status Sage from Abacus.AI hosting to Vercel + Vercel Postgres (Neon). Starting fresh on the database — no data migration required. Staying on Next.js 14 App Router.

## Architecture

| Layer | Before | After |
|---|---|---|
| Hosting | Abacus.AI (`/home/ubuntu/statussage/nextjs_space/`) | Vercel (auto-deploy from `main`) |
| Database | PostgreSQL on Abacus server | Vercel Postgres (Neon) |
| Monitoring cron | External cron on Abacus server | Vercel Cron Job |
| CDN/DNS | Cloudflare → Abacus | Cloudflare → Vercel |

Auto-deploy is connected to `github.com/startupsandcode/status_sage_v2`. Pushes to `main` trigger a Vercel build.

## Code Changes

### 1. `prisma/schema.prisma`

Remove the Abacus-specific binary target and hardcoded output path.

**Before:**
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]
  output = "/home/ubuntu/statussage/nextjs_space/node_modules/.prisma/client"
}
```

**After:**
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

`rhel-openssl-3.0.x` is the correct target for Vercel's Amazon Linux serverless environment.

### 2. `next.config.js`

Remove `outputFileTracingRoot` (was joining paths relative to the Abacus server directory structure). The `NEXT_DIST_DIR` and `NEXT_OUTPUT_MODE` env var references are harmless — they'll just be undefined on Vercel.

**Before:**
```js
experimental: {
  outputFileTracingRoot: path.join(__dirname, '../'),
},
```

**After:** Remove the `experimental` block entirely. Remove the `path` require.

### 3. `vercel.json` (new file)

Configures the Vercel Cron Job to trigger monitoring every minute, and sets a 60-second max duration on the monitoring check function (default 10s would time out with many monitors).

```json
{
  "crons": [
    {
      "path": "/api/monitoring/check",
      "schedule": "* * * * *"
    }
  ],
  "functions": {
    "app/api/monitoring/check/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### 4. `app/api/monitoring/check/route.ts`

Two additions:

**a)** Add the Vercel `maxDuration` export at the top of the file:
```ts
export const maxDuration = 60
```

**b)** Add a `GET` handler — Vercel Cron Jobs always make GET requests, not POST. The GET handler verifies a `CRON_SECRET` header (so the endpoint can't be triggered by random external requests) then runs the same all-monitors check logic as the existing POST handler:

```ts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // same logic as POST with no body (check all due monitors)
}
```

## Environment Variables

These must be set in the Vercel project dashboard:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Auto-set when Vercel Postgres is provisioned |
| `CRON_SECRET` | Generate a random secret (e.g. `openssl rand -hex 32`) |
| `NEXTAUTH_SECRET` | Generate a new secret |
| `NEXTAUTH_URL` | `https://statussage.com` |
| `STRIPE_SECRET_KEY` | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard (new webhook endpoint for Vercel URL) |
| Any other env vars | Copy from existing `.env` file |

## DNS Cutover

Once Vercel deployment is verified:

1. Add `statussage.com` as a custom domain in the Vercel project dashboard
2. In Cloudflare, update the CNAME/A record to point to the Vercel-provided DNS target
3. Vercel handles TLS automatically via Let's Encrypt

## Verification Steps

Before DNS cutover, verify locally:

1. `npm run build` — Prisma generates correctly, Next.js build succeeds
2. `npm run dev` — dev server starts
3. `curl -X POST http://localhost:3000/api/monitoring/check` — monitoring endpoint responds

After deploying to Vercel (before DNS cutover), verify via the Vercel preview URL:

4. App loads and auth works
5. Database connection works (can sign up / sign in)
6. Stripe webhooks updated to new domain
7. Cron job fires (visible in Vercel dashboard under Cron Jobs)

## What Is Not Changing

- Next.js 14 App Router — no framework switch
- NextAuth, Stripe, all API routes — already serverless-compatible
- Cloudflare remains in front for CDN/proxy
- No data migration — starting fresh
