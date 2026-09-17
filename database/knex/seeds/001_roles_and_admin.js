/**
 * Seeds the 5 fixed roles, the bootstrap admin account, and 4 additional
 * demo users - one per remaining role - so the whole review pipeline
 * (author -> editor -> reviewer -> publisher) has a real account to sign
 * in as at every stage without needing the admin to register each one
 * through the app first.
 *
 * Ordering matters here and is the reason this is a *seed*, not something
 * the API ever does: roles.created_by is NOT NULL and references
 * users(user_id), but users has no role of its own (role lives in the
 * separate user_roles join table) - so a first user CAN exist with no
 * role assigned yet. That breaks the chicken-and-egg problem:
 *   1. insert one bootstrap user (created_by = NULL, i.e. "system")
 *   2. insert the 5 roles, created_by = that bootstrap user's id
 *   3. link the bootstrap user to the admin role via user_roles
 *   4. insert the 4 demo users, created_by = the bootstrap admin's id
 *      (same as if the admin had created them through the app), and
 *      link each to its role via user_roles
 *
 * This matches the earlier decision that the very first admin is seeded
 * directly in the database, not created through the API (promoting
 * someone to admin requires an existing admin, so the very first one
 * can't be created any other way).
 *
 * role_id is explicit (1-5) rather than left to auto-increment, to
 * guarantee it matches the fixed mapping used throughout the app:
 *   1 author (default role) | 2 editor | 3 reviewer | 4 publisher | 5 admin
 *
 * Every password hash below is bcrypt(cost 12) of the same placeholder
 * password "password", precomputed rather than hashed here at seed-time
 * on purpose: this file lives under database/knex, outside backend/'s own
 * node_modules, so it can't import bcryptjs directly (knex resolves
 * seeds relative to THIS file, not the backend package - confirmed by
 * actually running `knex seed:run` against a live database while
 * building this project, not just assumed). These are the exact same
 * precomputed hashes used in database/postgres/schema.sql and
 * database/mysql/schema.sql, so all three seeding paths produce
 * identical accounts.
 *
 * SECURITY: this is demo/seed data - change these passwords (or better,
 * sign in once and change them via Profile) before this ever runs
 * against a real environment.
 */
const SEED_USERS = [
  // The first entry is the bootstrap admin - see the ordering note above
  // for why it has to be inserted before the roles it then "creates".
  {
    fullName: 'Aditi Singh',
    email: 'aditi.singh@docflow.admin',
    // bcrypt(cost 12) of "password"
    hashPassword: '$2b$12$dhlUQj.V2qv48y9VymqSaeMq76QgXwstDl5/DPv/FCce.sd23bx7q',
    roleId: 5, // admin
  },
  {
    fullName: 'Aman Bisht',
    email: 'aman.bisht@docflow.author',
    hashPassword: '$2b$12$N2sYNzhOSeYSw4j2Vz0Y/uowuHT7Y8m5EZYCONFdpx/BKnMIa.s4G',
    roleId: 1, // author
  },
  {
    fullName: 'Esha Singh',
    email: 'esha.singh@docflow.editor',
    hashPassword: '$2b$12$r76.TsruGD/nHk9erUxxSuJE0TQnR9s3A2rOIh6vjPEswrLwi9Z.C',
    roleId: 2, // editor
  },
  {
    fullName: 'Rita Kumari',
    email: 'rita.kumari@docflow.reviewer',
    hashPassword: '$2b$12$3c5qvhodERcD9a6d0zkoM.HHbNpVkOBxqqw1A.4HtHLxOWNRucC96',
    roleId: 3, // reviewer
  },
  {
    fullName: 'Piyush Bhatt',
    email: 'piyush.bhatt@docflow.publisher',
    hashPassword: '$2b$12$dzyS6kZIb24jzOeuxPGhiONQJ8Blh6ZDpQUplsFcHryJzxbJAUT9.',
    roleId: 4, // publisher
  },
];

export async function seed(knex) {
  // TRUNCATE ... CASCADE instead of four separate .del() calls: this
  // seed needs to stay re-runnable against a database that's actually
  // been used through the app, not just one that only ever had these
  // seeded users in it. Every one of this schema's 18 tables eventually
  // references users - either directly (created_by/updated_by/
  // action_by/approver_id) or via documents, which itself references
  // users - so the moment the app has been used for real,
  // document_stage_history, editorial_requests, and everything else can
  // hold rows pointing at exactly these user ids, and a plain
  // knex('users').del() fails with a foreign key violation, the same way
  // deleting a user by hand anywhere else in the app would. TRUNCATE
  // CASCADE walks that whole dependency graph automatically instead of
  // this file trying to enumerate every table that might reference
  // users - and stays correct if a new one is ever added later, instead
  // of quietly going stale the way the four explicit .del() calls this
  // replaced already had. RESTART IDENTITY resets the id sequence back
  // to 1, so the ids this seed relies on keep lining up with the ones
  // hardcoded in database/postgres/schema.sql and database/mysql/
  // schema.sql across repeated re-runs, rather than drifting upward a
  // little further each time.
  await knex.raw('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

  const [bootstrapAdmin, ...rest] = SEED_USERS;

  const [admin] = await knex('users')
    .insert({
      full_name: bootstrapAdmin.fullName,
      email: bootstrapAdmin.email,
      is_active: true,
      created_by: null,
    })
    .returning(['user_id']);

  await knex('user_passwords').insert({
    user_id: admin.user_id,
    hash_password: bootstrapAdmin.hashPassword,
    created_by: admin.user_id,
  });

  await knex('roles').insert([
    { role_id: 1, role_name: 'author', role_level: 1, description: 'Creates documents; the default role for every new registration.', created_by: admin.user_id },
    { role_id: 2, role_name: 'editor', role_level: 2, description: 'Reviews documents promoted out of Draft, at the Editorial stage.', created_by: admin.user_id },
    { role_id: 3, role_name: 'reviewer', role_level: 3, description: 'Confirms documents promoted out of Editorial, at the Review stage.', created_by: admin.user_id },
    { role_id: 4, role_name: 'publisher', role_level: 4, description: 'Publishes or unpublishes documents promoted out of Review, at the Publication stage.', created_by: admin.user_id },
    { role_id: 5, role_name: 'admin', role_level: 5, description: 'Manages users and role assignments; does not author documents.', created_by: admin.user_id },
  ]);

  await knex('user_roles').insert({
    user_id: admin.user_id,
    role_id: bootstrapAdmin.roleId, // admin
    created_by: admin.user_id,
  });

  // The 4 demo accounts, one per remaining role, created "by" the admin
  // now that both the admin and the roles table exist.
  for (const u of rest) {
    const [user] = await knex('users')
      .insert({
        full_name: u.fullName,
        email: u.email,
        is_active: true,
        created_by: admin.user_id,
      })
      .returning(['user_id']);

    await knex('user_passwords').insert({
      user_id: user.user_id,
      hash_password: u.hashPassword,
      created_by: admin.user_id,
    });

    await knex('user_roles').insert({
      user_id: user.user_id,
      role_id: u.roleId,
      created_by: admin.user_id,
    });
  }
}
