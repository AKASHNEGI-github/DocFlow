import 'dotenv/config';

/**
 * Migrations and seeds live in database/knex (one level up from backend/,
 * shared conceptually with database/postgres and database/mysql) rather
 * than inside backend/, so the database/ folder stays the single place
 * that fully describes the schema in every format.
 */
const connection = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : {
      host: process.env.PG_HOST || 'localhost',
      port: Number(process.env.PG_PORT) || 5432,
      user: process.env.PG_USER || 'docflow',
      password: process.env.PG_PASSWORD || 'docflow',
      database: process.env.PG_DATABASE || 'docflow',
    };

export default {
  client: 'pg',
  connection,
  migrations: {
    directory: '../database/knex/migrations',
  },
  seeds: {
    directory: '../database/knex/seeds',
  },
  pool: { min: 2, max: 10 },
};
