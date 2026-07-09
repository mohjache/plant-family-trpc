import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "~/server/db/schema";

/**
 * Cache the database connection in development. This avoids creating a new
 * connection on every HMR update. We use postgres.js (not the Neon HTTP driver)
 * so multi-step mutations can run inside a real interactive transaction — the
 * cycle checks and origin/delete flows read, then conditionally write.
 *
 * `prepare: false` is required because the Neon pooler runs pgbouncer in
 * transaction mode, which does not support prepared statements.
 */
const globalForDb = globalThis as unknown as {
	conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL, { prepare: false });
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
