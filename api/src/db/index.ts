import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/index.js";

const pool = new Pool({ connectionString: config.DATABASE_URL });

export const db = drizzle(pool);

// `db` or the `tx` from inside a transaction
export type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];
