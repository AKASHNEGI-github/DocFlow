/**
 * All enum types used across the schema, created up front so every later
 * migration can reference them directly in a column definition.
 */
export async function up(knex) {
  await knex.raw(`
    CREATE TYPE user_login_status AS ENUM (
      'SUCCESS',
      'FAILURE'
    );

    CREATE TYPE document_stage AS ENUM (
      'DRAFT',
      'EDITORIAL',
      'REVIEW',
      'PUBLICATION',
      'LIVE'
    );

    CREATE TYPE request_status AS ENUM (
      'NONE',
      'PENDING',
      'APPROVED',
      'REJECTED',
      'CANCELLED'
    );

    CREATE TYPE approver_action AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'CANCELLED'
    );

    CREATE TYPE delete_approver_role AS ENUM (
      'EDITOR',
      'REVIEWER',
      'PUBLISHER'
    );
  `);
}

export async function down(knex) {
  await knex.raw(`
    DROP TYPE IF EXISTS delete_approver_role;
    DROP TYPE IF EXISTS approver_action;
    DROP TYPE IF EXISTS request_status;
    DROP TYPE IF EXISTS document_stage;
    DROP TYPE IF EXISTS user_login_status;
  `);
}
