# Tuition Manager API

Next.js (App Router) + TypeScript + Prisma + Neon Postgres backend for a
Tuition Management Android app, deployable on Vercel.

Only three environment variables are needed to run this: `DATABASE_URL`,
`DIRECT_URL`, and `JWT_SECRET` (plus optional `JWT_EXPIRES_IN`). Materials
store a Google Drive link the teacher pastes in - there's no Google API
integration, so no service account setup at all.

## 1. Initialize & install

```bash
cd tuition-api
npm install
```

This pulls in `next`, `react`, `@prisma/client`, `jsonwebtoken`, and
`bcryptjs`, plus type definitions and `prisma` as a dev dependency.
`postinstall` automatically runs `prisma generate`.

If scaffolding from scratch instead of using this folder directly:

```bash
npx create-next-app@latest tuition-api --typescript --eslint --app --src-dir --import-alias "@/*"
cd tuition-api
npm install @prisma/client jsonwebtoken bcryptjs
npm install -D prisma @types/jsonwebtoken @types/bcryptjs
```

## 2. Environment variables

```bash
cp .env.example .env
```

**Neon Postgres** - Neon dashboard → your project → Connection Details.
Grab both the pooled connection string (`DATABASE_URL`, used at runtime,
routes through PgBouncer) and the direct connection string (`DIRECT_URL`,
used only by `prisma migrate` for schema changes).

**JWT** - generate a strong secret:

```bash
openssl rand -base64 32
```

(or use generate-secret.vercel.app/32 in a browser). Put it in
`JWT_SECRET`. `JWT_EXPIRES_IN` accepts values like `"30d"`, `"12h"`.

## 3. Database schema

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If `migrate dev` fails to create a shadow database (some restricted Neon
roles disallow it), use instead:

```bash
npx prisma db push
```

## 4. Run locally

```bash
npm run dev
```

Test the login route:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9999999999","password":"secret"}'
```

(You'll need at least one user row with a bcrypt-hashed password first -
easiest via Prisma Studio, `npm run prisma:studio`.)

## 5. Deploy to Vercel

**CLI:**

```bash
npm install -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN
vercel --prod
```

Set the project's **Build Command** (Settings → General → Build &
Development Settings) to:

```
npm run vercel-build
```

which runs `prisma generate && prisma migrate deploy && next build`, so
schema migrations apply on every deploy against `DIRECT_URL`.

**Browser-only, no CLI:** push this folder to a GitHub repo, then on
vercel.com → Add New → Project → import the repo. Before clicking Deploy,
add the 3 env vars and override the Build Command as above.

## 6. How materials work (no Google API needed)

1. The teacher uploads the PDF to their own Google Drive as usual.
2. They right-click it → Share → "Anyone with the link" → Viewer, and
   copy the link.
3. The app calls `POST /api/teacher/materials` with:
   ```json
   { "class_id": "...", "title": "Chapter 4 Notes", "drive_link": "https://drive.google.com/file/d/XXXX/view?usp=sharing" }
   ```
4. The API extracts the Drive file ID from that link and saves
   `drive_file_id` + a normalized `drive_view_link` to the database.
   Nothing is uploaded through the server - it just stores the link.

## Design notes / assumptions

- **Auth wrapper, not root `middleware.ts`:** Next's root-level
  `middleware.ts` runs on the Edge Runtime, which doesn't support
  `jsonwebtoken` (needs Node's `crypto`) or Prisma. `withAuth()` in
  `src/middleware/withAuth.ts` is a per-route higher-order function
  instead, used on Node.js-runtime route handlers.
- **`Notice.target_role`** is a plain string (`"TEACHER" | "STUDENT" |
  "ALL"`) rather than the `Role` enum, so a notice can target both roles
  without a nullable enum.
- **Fee-recording ownership check** (`/api/teacher/fees`) verifies the
  student's `class.teacher_id` matches the caller. A student with no
  `class_id` set has no class to check against, so fees can't be recorded
  for them yet under this rule - assign them to a class first, or relax
  the check if your app needs otherwise.
- **Materials are link-based, not uploaded through the API** - see
  section 6 above. If you later want the app itself to push files to
  Drive (rather than the teacher sharing a link), that needs a Google
  service account and re-introduces those extra env vars and the
  request-body-size limits that come with base64 uploads.
- **Money fields** are Prisma `Decimal`; all API responses convert them
  to plain `number` via `src/lib/serialize.ts` for consistent JSON.
