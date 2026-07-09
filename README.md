# Plant Family

Track the plants you own — your Inventory — the photos documenting each one
across its life (its Timeline), and the breeding lineage (Pedigree) that
connects them. See [CONTEXT.md](CONTEXT.md) for the domain language.

## Stack

- **Next.js** (App Router) + **React 19**
- **tRPC** + **TanStack Query** for the typed API and client cache
- **Drizzle ORM** on **Neon Postgres** (schema namespaced under `plant_family`)
- **WorkOS AuthKit** for authentication
- **Vercel Blob** for plant photo storage
- **shadcn/ui** + Tailwind CSS v4

## Architecture

- Data model lives in [`src/server/db/schema.ts`](src/server/db/schema.ts):
  `plant`, `plant_photo`, and `parent_edge` (the Pedigree DAG).
- All business logic is in the tRPC router
  [`src/server/api/routers/plants.ts`](src/server/api/routers/plants.ts):
  queries (`listInventory`, `getPlantDetail`, `getPedigree`, …) and mutations
  (`createPlant`, `recordCross`, `addPhoto`, …). Multi-write mutations run in
  interactive Postgres transactions; the no-cycle Pedigree invariant is enforced
  on write.
- Every request is scoped to the signed-in WorkOS user via `protectedProcedure`
  (`ctx.user.id` is the tenant / owner id).
- Photos upload directly to Vercel Blob through
  [`src/app/api/upload/route.ts`](src/app/api/upload/route.ts) (client-upload
  flow); the returned URL is persisted by the `addPhoto` mutation.

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — Neon connection string
   - `WORKOS_CLIENT_ID`, `WORKOS_API_KEY` — from the WorkOS dashboard
   - `WORKOS_COOKIE_PASSWORD` — any 32+ char secret (`openssl rand -base64 32`)
   - `NEXT_PUBLIC_WORKOS_REDIRECT_URI` — must match a redirect URI registered in
     WorkOS (defaults to `http://localhost:3000/callback`)
   - `BLOB_READ_WRITE_TOKEN` — from a Vercel Blob store
3. In the WorkOS dashboard, add `http://localhost:3000/callback` as a redirect
   URI (and your production callback URL when you deploy).
4. `pnpm db:push` — create the tables in the `plant_family` schema.
5. `pnpm dev`

## Scripts

- `pnpm dev` — start the dev server
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm check` / `pnpm check:write` — Biome lint + format
- `pnpm db:push` / `pnpm db:studio` — Drizzle schema push / studio
