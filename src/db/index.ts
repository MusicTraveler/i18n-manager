import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { cache } from "react";
import type { DB } from "./types";

// Create a PostgreSQL connection pool
export const createConnection = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

  const dialect = new PostgresDialect({
    pool,
  });

  return new Kysely<DB>({
    dialect,
  });
};

// Cache the database connection for React components
export const getDb = cache(() => {
  return createConnection();
});

// Async version for use in static routes
export const getDbAsync = cache(async () => {
  return createConnection();
});
