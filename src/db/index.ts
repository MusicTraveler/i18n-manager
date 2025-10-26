import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { DB } from './types';
import { cache } from 'react';

// Create a PostgreSQL connection pool
const createConnection = () => {
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
