# Vercel Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Status Sage from Abacus.AI to Vercel + Vercel Postgres (Neon), starting fresh on the database.

**Architecture:** Next.js 14 App Router deployed on Vercel with auto-deploy from `main`. Vercel Postgres (Neon) replaces the Abacus PostgreSQL instance. Vercel Cron Jobs replace the Abacus server cron, calling `GET /api/monitoring/check` every minute.

**Tech Stack:** Next.js 14, Prisma 6, Vercel Postgres (Neon), NextAuth, Stripe, Cloudflare (DNS/CDN)

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Fix binary targets, remove hardcoded output path |
| `package.json` | Add `postinstall` script to generate Prisma client during Vercel build |
| `next.config.js` | Remove Abacus-specific `experimental.outputFileTracingRoot` and `path` require |
| `vercel.json` | New — Cron Job config + 60s function timeout for monitoring check |
| `app/api/monitoring/check/route.ts` | Add `maxDuration`, extract shared logic, add `GET` handler for cron |

---

## Task 1: Fix Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:1-4`

- [ ] **Step 1: Update the generator block**

Replace the entire generator block in `prisma/schema.prisma`:

```prisma
generator client {
    provider = "prisma-client-js"
    binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

`rhel-openssl-3.0.x` is the correct Prisma binary target for Vercel's Amazon Linux serverless runtime. The hardcoded `output` path pointed at the Abacus server filesystem — removing it lets Prisma use the default location (`node_modules/.prisma/client`).

- [ ] **Step 2: Verify Prisma client generates**

```bash
npx prisma generate
```

Expected: Output ends with `✔ Generated Prisma Client` and no errors about missing files or binary targets.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "fix: update Prisma binary target for Vercel, remove hardcoded output path"
```

---

## Task 2: Add Prisma Generate to Build

**Files:**
- Modify: `package.json`

Vercel runs `npm install` then the build command. Without a `postinstall` script, `prisma generate` never runs and the Prisma client won't exist in the serverless function bundle.

- [ ] **Step 1: Add postinstall script**

In `package.json`, add `"postinstall"` to the `"scripts"` block:

```json
"scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
},
```

- [ ] **Step 2: Verify it runs**

```bash
npm install
```

Expected: After dependency installation, you see `✔ Generated Prisma Client` in the output.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "fix: run prisma generate on postinstall for Vercel builds"
```

---

## Task 3: Simplify next.config.js

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Remove Abacus-specific config**

Replace the entire contents of `next.config.js` with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
```

Removed: `const path = require('path')` and `experimental.outputFileTracingRoot`. The `outputFileTracingRoot` was set to `path.join(__dirname, '../')` which resolved to a path on the Abacus server. On Vercel this would point outside the build directory and cause issues. The `NEXT_DIST_DIR` and `NEXT_OUTPUT_MODE` env var references are harmless — they'll be undefined on Vercel and use defaults.

- [ ] **Step 2: Verify build still works**

```bash
npm run build
```

Expected: Build completes successfully with no errors. You'll see route and page size output in the terminal.

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "fix: remove Abacus-specific outputFileTracingRoot from next.config.js"
```

---

## Task 4: Create vercel.json

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

Create `vercel.json` at the project root:

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

`schedule: "* * * * *"` runs every minute. The existing check route already skips monitors that aren't due based on their individual `checkInterval`, so running every minute is safe — it's a polling loop, not a forced execution.

`maxDuration: 60` overrides Vercel's default 10-second function timeout for this route. With many monitors queued, the check loop can take longer than 10s.

- [ ] **Step 2: Validate JSON**

```bash
node -e "require('./vercel.json'); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron job and function timeout config"
```

---

## Task 5: Add GET Cron Handler to Monitoring Check Route

**Files:**
- Modify: `app/api/monitoring/check/route.ts`

Vercel Cron Jobs always send GET requests. The existing route only has a POST handler. We need to:
1. Add `export const maxDuration = 60` (route-level, reinforces vercel.json)
2. Extract the "check all due monitors" logic into a shared function
3. Add a GET handler that validates `CRON_SECRET` and calls that shared function

- [ ] **Step 1: Add maxDuration and GET handler**

At the very top of `app/api/monitoring/check/route.ts`, after the imports, add:

```ts
export const maxDuration = 60
```

Then add this function just before the existing `POST` export (after the `calculateUptimeMetrics` function):

```ts
async function runAllDueMonitors() {
  const now = new Date()
  const monitors = await prisma.monitor.findMany({
    where: {
      isEnabled: true,
      OR: [
        { lastCheck: null },
        {
          lastCheck: {
            lt: new Date(now.getTime() - 60 * 1000)
          }
        }
      ]
    }
  })

  const results = []
  let checkedCount = 0

  for (const monitor of monitors) {
    if (monitor.lastCheck) {
      const timeSinceLastCheck = now.getTime() - monitor.lastCheck.getTime()
      const intervalMs = monitor.checkInterval * 1000
      if (timeSinceLastCheck < intervalMs) {
        continue
      }
    }

    try {
      const result = await checkMonitor(monitor)
      const statusChanged = await updateMonitorStatus(monitor.id, result)
      await calculateUptimeMetrics(monitor.id)
      results.push({ monitorId: monitor.id, name: monitor.name, result, statusChanged })
      checkedCount++
    } catch (error: any) {
      console.error(`Failed to check monitor ${monitor.id}:`, error)
      results.push({ monitorId: monitor.id, name: monitor.name, error: error?.message || 'Unknown error' })
    }
  }

  return NextResponse.json({
    message: `Checked ${checkedCount} monitors`,
    totalFound: monitors.length,
    results
  })
}
```

Then add the GET handler after `runAllDueMonitors`:

```ts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runAllDueMonitors()
}
```

- [ ] **Step 2: Update the POST handler to use the shared function**

In the existing `POST` handler, replace the `else` branch (the "check all monitors" block that starts with `// Check all monitors that are due`) with a call to `runAllDueMonitors()`:

The POST handler's else branch should become:

```ts
} else {
  return runAllDueMonitors()
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: Build succeeds. No TypeScript errors in the monitoring check route.

- [ ] **Step 4: Test the POST endpoint locally**

Start the dev server (requires a local `.env` with `DATABASE_URL` pointing to a running Postgres — skip if you don't have one locally, the Vercel build verification is sufficient):

```bash
curl -X POST http://localhost:3000/api/monitoring/check \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected (with DB): JSON response with `message: "Checked N monitors"`.
Expected (no DB): Connection error — acceptable, build verification is what matters here.

- [ ] **Step 5: Commit**

```bash
git add app/api/monitoring/check/route.ts
git commit -m "feat: add GET cron handler to monitoring check route with CRON_SECRET auth"
```

---

## Task 6: Push to GitHub

- [ ] **Step 1: Push main to GitHub**

```bash
git push origin main
```

Expected: Push succeeds. Vercel will auto-deploy once connected in Task 7.

---

## Task 7: Vercel Project Setup (Manual Steps)

These steps are done in the browser at [vercel.com](https://vercel.com). No code changes.

- [ ] **Step 1: Create Vercel project**

1. Go to vercel.com → New Project
2. Import from GitHub: `startupsandcode/status_sage_v2`
3. Set **Root Directory** to `.` (the repo root — the Next.js app is at the root)
4. Framework preset: Next.js (Vercel auto-detects this)
5. Do NOT deploy yet — set env vars first

- [ ] **Step 2: Provision Vercel Postgres**

1. In the Vercel project → Storage tab → Create Database → Postgres
2. Name it `statussage-db` (or similar)
3. Select a region close to your users
4. Click Create — Vercel automatically adds `DATABASE_URL`, `POSTGRES_URL`, and related vars to your project env vars

- [ ] **Step 3: Set remaining environment variables**

In Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | Run `openssl rand -hex 32` locally and paste the output |
| `NEXTAUTH_URL` | `https://statussage.com` |
| `CRON_SECRET` | Run `openssl rand -hex 32` locally and paste the output (different value from NEXTAUTH_SECRET) |
| `STRIPE_SECRET_KEY` | From Stripe dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Leave blank for now — set after Step 6 |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console OAuth credentials |

- [ ] **Step 4: Deploy**

Click Deploy in the Vercel dashboard. Watch the build logs — it should:
- Run `npm install` (which triggers `postinstall` → `prisma generate`)
- Run `next build`
- Complete successfully

If the build fails, check the logs. Common issues:
- Missing env var → add it to Vercel and redeploy
- TypeScript error → fix locally, push, redeploy

- [ ] **Step 5: Note your Vercel preview URL**

It will be something like `status-sage-v2-abc123.vercel.app`. You'll use this in Task 8.

---

## Task 8: Run Database Migrations

The Vercel Postgres database is empty. Run migrations from your local machine pointing at the Vercel Postgres URL.

- [ ] **Step 1: Get the DATABASE_URL from Vercel**

In Vercel → Storage → your Postgres database → `.env.local` tab → copy the `DATABASE_URL` value.

- [ ] **Step 2: Run migrations against Vercel Postgres**

```bash
DATABASE_URL="<paste-url-here>" npx prisma migrate deploy
```

Expected output ends with:
```
All migrations have been successfully applied.
```

- [ ] **Step 3: Verify schema was created**

```bash
DATABASE_URL="<paste-url-here>" npx prisma studio
```

Opens Prisma Studio in your browser. Confirm the tables (User, Monitor, MonitorCheck, Incident, etc.) exist and are empty.

Close Prisma Studio when done.

---

## Task 9: Verify Vercel Deployment

Using the Vercel preview URL from Task 7 Step 5.

- [ ] **Step 1: App loads**

Open `https://status-sage-v2-abc123.vercel.app` in a browser. The landing page should load without errors.

- [ ] **Step 2: Auth works**

Click Sign In. Try signing up with a new account (email/password or Google). Confirm you can create an account and reach the dashboard.

- [ ] **Step 3: Confirm cron job is registered**

In Vercel dashboard → your project → Cron Jobs tab. You should see `/api/monitoring/check` listed with schedule `* * * * *`. Wait 1-2 minutes and confirm it has fired (Last Run shows a recent timestamp).

- [ ] **Step 4: Set up Stripe webhook**

1. Go to Stripe dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://status-sage-v2-abc123.vercel.app/api/stripe/webhooks`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook signing secret
5. In Vercel → Settings → Environment Variables → add `STRIPE_WEBHOOK_SECRET` with that value
6. Redeploy (Vercel → Deployments → Redeploy latest)

---

## Task 10: DNS Cutover

Do this only after Task 9 is fully verified.

- [ ] **Step 1: Add custom domain in Vercel**

Vercel project → Settings → Domains → Add `statussage.com` and `www.statussage.com`.

Vercel will show you a DNS target — something like `cname.vercel-dns.com` or a specific IP.

- [ ] **Step 2: Update Cloudflare DNS**

In Cloudflare dashboard for `statussage.com`:
1. Find the existing A or CNAME record pointing to the Abacus server
2. Update it to point to the Vercel DNS target from Step 1
3. Keep **Proxy status: Proxied** (orange cloud) — Cloudflare stays in front

- [ ] **Step 3: Update NEXTAUTH_URL**

`NEXTAUTH_URL` is already set to `https://statussage.com` from Task 7, so no change needed.

- [ ] **Step 4: Verify production domain works**

Wait 1-5 minutes for DNS propagation, then open `https://statussage.com`. Confirm:
- Site loads
- Sign in works
- Stripe checkout works (do a test purchase with a Stripe test card)

- [ ] **Step 5: Update Stripe webhook to production URL**

In Stripe → Webhooks, add a second endpoint:
- URL: `https://statussage.com/api/stripe/webhooks`
- Same events as before

You can delete the preview URL webhook from Task 9 Step 4 once production is confirmed working.

---

## Rollback Plan

If something goes wrong after DNS cutover:

1. In Cloudflare, revert the DNS record to point back at the Abacus IP (if the server is still running)
2. DNS TTL on Cloudflare is typically 5 minutes — rollback is fast
3. The Vercel deployment stays in place — no data was deleted from Abacus
