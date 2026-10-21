# StatusSage

StatusSage is an open-source website and API monitoring application. It records uptime and response-time history, tracks incidents, supports scheduled and manual checks, and includes account, alert, authentication, and Stripe billing flows.

## Stack

- Next.js 14, React 18, and TypeScript
- PostgreSQL with Prisma
- NextAuth with credentials and optional Google OAuth
- Stripe Checkout, customer portal, and signed webhooks
- Vercel Cron-compatible monitoring endpoint

## Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL
- Optional Google OAuth, Stripe, and Vercel accounts for their respective integrations

## Local setup

```bash
git clone https://github.com/startupsandcode/status_sage_v2.git
cd status_sage_v2
npm ci
cp .env.example .env
npx prisma migrate dev
npm run dev
```

At minimum, configure `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`. `CRON_SECRET` is required for authenticated scheduled checks. Google and Stripe variables are optional unless those integrations are used.

## Database seeding

```bash
npx prisma db seed
```

The seed script creates a predictable development-only account and sample monitors. Read `scripts/seed.ts` before running it, and never seed a production database.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run lint` | Run the Next.js ESLint checks |
| `npx tsc --noEmit` | Type-check without emitting files |
| `npm run build` | Create a production build |
| `npm start` | Run the production server after a build |

## Deployment notes

- Set every production environment variable in the hosting platform rather than committing an environment file.
- Use different random values for `NEXTAUTH_SECRET` and `CRON_SECRET`.
- Configure the Stripe webhook endpoint at `/api/stripe/webhooks` and set its signing secret.
- Apply Prisma migrations before serving production traffic.
- The included Vercel cron configuration calls the protected monitoring endpoint.
- Monitor targets must use HTTP or HTTPS and resolve only to public network addresses; local, private, link-local, and credential-bearing URLs are rejected.

## Project status

StatusSage is under active development. Operators are responsible for database backups, outbound-request controls, alert delivery, rate limiting, and the security of monitored URLs and credentials.

## License

MIT © 2026 Startups and Code. See [LICENSE](LICENSE).
