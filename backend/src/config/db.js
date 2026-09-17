import pg from 'pg';
import knexLib from 'knex';
import knexConfig from '../../knexfile.js';

/**
 * node-postgres returns BIGINT (OID 20 / int8) columns as JS strings by
 * default, since a bigint can exceed Number.MAX_SAFE_INTEGER. Every
 * primary/foreign key in this schema is BIGINT (user_id, document_id,
 * ...), and application code throughout compares them with strict
 * equality against req.user.id (a plain number decoded from the JWT) -
 * "7" !== 7 would silently break every ownership/assignment check in the
 * app. This was caught by actually running the full lifecycle against a
 * live database while building this project, not just assumed safe.
 * Auto-incrementing ids here will never approach Number.MAX_SAFE_INTEGER
 * (~9 quadrillion), so parsing them as numbers is safe in practice.
 */
pg.types.setTypeParser(20, (value) => parseInt(value, 10));

const db = knexLib(knexConfig);

export default db;
