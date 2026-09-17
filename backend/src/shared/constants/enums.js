/**
 * Mirrors the Postgres enum types 1:1 (see database/knex/migrations/001_create_enums.js).
 * Kept as plain JS objects, not a validation library's own enum construct,
 * so every module's zod schema file can import from here and stay in
 * lockstep with the database rather than redefining the same string
 * lists independently.
 */

export const ROLES = Object.freeze({
  AUTHOR: 'author',
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  PUBLISHER: 'publisher',
  ADMIN: 'admin',
});

// The 4 roles that can author documents and move through the pipeline.
// Admin is deliberately excluded - it manages users, not documents.
export const CONTENT_ROLES = Object.freeze([
  ROLES.AUTHOR,
  ROLES.EDITOR,
  ROLES.REVIEWER,
  ROLES.PUBLISHER,
]);

export const DOCUMENT_STAGE = Object.freeze({
  DRAFT: 'DRAFT',
  EDITORIAL: 'EDITORIAL',
  REVIEW: 'REVIEW',
  PUBLICATION: 'PUBLICATION',
  LIVE: 'LIVE',
});

export const REQUEST_STATUS = Object.freeze({
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

// Statuses a phase's promote-again action accepts - a document that was
// Rejected or Cancelled at a phase is eligible to be re-raised from that
// same phase, per the "re-raise = insert a new request row" decision.
export const RE_PROMOTABLE_STATUSES = Object.freeze([
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.CANCELLED,
]);

// Statuses a document owner may delete from - anything except PENDING,
// since a pending request has a live approver decision outstanding and
// must be cancelled first.
export const DELETABLE_STATUSES = Object.freeze([
  REQUEST_STATUS.NONE,
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.CANCELLED,
]);

export const APPROVER_ACTION = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

export const DELETE_APPROVER_ROLE = Object.freeze({
  EDITOR: 'EDITOR',
  REVIEWER: 'REVIEWER',
  PUBLISHER: 'PUBLISHER',
});
