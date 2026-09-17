# DocFlow

A document workflow platform: every document goes through a fixed editorial
pipeline - **Draft → Editorial → Review → Publication → Live** - handed off
role to role like a docflow, plus a separate **Deletion** flow for retiring a
live document. Built collaboratively, backend-first, over an extended design
conversation before a single line of code was written - this README is the
record of that design, not just an API reference.

**Looking for more depth than this file goes into?** `ProjectInfo.md`, at
the project root, is the exhaustive reference - every design decision and
edge case with its reasoning, the complete API reference, every backend
and frontend file's purpose, and a full walkthrough of how the embedded
editor is integrated. This README stays intentionally shorter; that file
is written so nothing about the application is left in doubt.

## Contents

1. [Roles](#roles)
2. [The document lifecycle](#the-document-lifecycle)
3. [The Core Navigation Rule](#the-core-navigation-rule)
4. [Design decisions & edge cases resolved](#design-decisions--edge-cases-resolved)
5. [Project structure](#project-structure)
6. [Database](#database)
7. [Getting started](#getting-started)
8. [API reference](#api-reference)
9. [Frontend](#frontend)

---

## Roles

Five fixed roles, seeded once and never created through the API:

| role_id | role_name | Can author documents? | Notes |
|---|---|---|---|
| 1 | author | Yes | The default role - every self-registered account starts here |
| 2 | editor | Yes | Also the Editorial-stage approver role |
| 3 | reviewer | Yes | Also the Review-stage approver role |
| 4 | publisher | Yes | Also the Publication-stage approver role, and one of the 3 Deletion approvers |
| 5 | admin | **No** | Manages users and role assignments only |

**Any of the first four roles can create a document** - "author" is not a
gate on who may author, it's just the name of the default role a brand-new
account starts with. A user's account role only determines which *approver*
picker lists (editors/reviewers/publishers) they can be selected into -
document ownership (who may edit/promote/cancel/delete/upgrade a specific
document) is tracked per-document via `documents.created_by`, completely
independent of the owner's current account role.

Admin is the exception: it never authors documents and has no phase screens
of its own - only user management, plus read access to the Home feed like
every other user.

## The document lifecycle

```
Doc Onboard --create--> Draft --promote--> Editorial --promote--> Review --promote--> Publication --publish--> Live
                                    ^  |               ^  |                  ^  |
                                    |  reject/cancel    |  reject/cancel     |  reject (unpublish, no revert)
                                    |__|                |__|                |
                                                                             |
                                                          Live --request--> Deletion (1 editor + 1 reviewer + 1 publisher, unanimous)
                                                          Live --upgrade--> new v(n+1) in Draft
```

- **Promote** always means: the document's author selects one or more people
  holding the next role in line, which raises a new **Pending** request.
- **Approve** at Editorial/Review moves the document one phase forward.
  **Approve** at Publication *is* the terminal action - it publishes
  directly, there's no separate "promote to Live" step.
- **Reject** at Editorial/Review sends the document back a phase for the
  author to fix and re-raise. **Reject** at Publication means *unpublish*
  and is different - see below.
- Whichever assigned approver acts **first** decides the outcome for the
  whole request (editors/reviewers/publishers can have more than one person
  assigned specifically so any one of them can act without blocking on the
  others). Deletion is the one exception: it needs all three, unanimously.

## The Core Navigation Rule

This is the single idea that makes the rest of the flow consistent, and it
was the hardest thing to get right during design:

> **A document's displayed phase is always whichever of
> editorial_requests / review_requests / publication_requests holds its
> most recent row - regardless of that row's status.** `documents.stage`
> is a *separate*, structural field that only gates permissions
> (editability, locking); it does not decide which phase-tab a document
> shows under.

Concretely: `documents.stage` advances the moment a request is raised
(Pending), not when it's approved - and it *reverts* on Reject/Cancel
(Editorial's reject sends it back to Draft, Review's reject sends it back
to Editorial). But the document keeps *displaying* under the phase it was
just rejected/cancelled at, with a "promote again" action right there,
because the Core Navigation Rule only looks at the request tables, never at
`documents.stage`. A document rejected at Editorial has `stage = DRAFT` and
`latestPhase = EDITORIAL, latestStatus = REJECTED` at the same time - both
are correct, they answer different questions ("what can be done to it
right now" vs. "where does it show up").

The one deliberate exception is Publication's Reject (**unpublish**): stage
does **not** revert to Review, because the content was never in question,
only publish-readiness - the author can re-raise directly from Publication
without earning a fresh Review approval.

Every re-raise (after Rejected or Cancelled, at any phase) **inserts a
brand-new request row** rather than reusing/updating the old one - the
rejected/cancelled row stays untouched as permanent history, and "current
status" is always just "the latest row for this document, whichever table
it's in."

## Design decisions & edge cases resolved

Recorded here because most of them aren't obvious from the schema alone,
and several reverse an earlier draft of the same rule once a consequence of
it turned up later in the conversation.

- **Delete is allowed at every status except Pending.** A Pending request
  has a decision outstanding for someone else; cancel it first, then delete
  becomes available (None/Approved/Rejected/Cancelled all qualify).
- **Editors can edit while their request is Pending, independent of their
  Approve/Reject decision.** Reviewers and Publishers never get an edit
  action at all - by design, each of the three approver roles does a
  different job (editor edits, reviewer confirms, publisher publishes); if
  all three could edit, there'd be no reason to have three roles.
- **The author can edit a document that's Rejected or Cancelled, at any
  phase** - not just back in Draft. This is what makes "promote again"
  meaningful: fix the content, then re-raise from wherever it landed.
- **A Cancelled request displays exactly like a Rejected one** - at the
  phase it was cancelled, with promote-again available - never bounced back
  down a level for display purposes, even though `documents.stage` does
  revert. Cancel and Reject are structurally the same event (a Pending
  request ending without approval); they just differ in who triggered it.
- **`document_name` is `"V{version} - {title}"`, not a plain title column,
  and it's this composite that's UNIQUE**, not the title alone. A plain
  `UNIQUE(title)` can't coexist with cloning-based versioning: an Upgrade
  clones the same title into a brand-new `document_id`, which a bare
  uniqueness constraint would reject outright. The raw title is recovered
  for edit-form pre-fills by stripping the fixed, system-generated
  `"V{n} - "` prefix.
- **Only the current version of a document family is ever "Live" at once**
  (`document_live.is_current`, enforced by a partial unique index on
  Postgres - see [Database](#database) for the MySQL equivalent). An
  Upgrade doesn't touch the live document at all; it clones a new
  `document_id` into Draft, linked via `parent_document_id`/
  `root_document_id`, and only takes over as "the" live version once *it*
  independently reaches Live through the full pipeline.
- **One upgrade in flight per document family, and Upgrade/Deletion are
  mutually exclusive.** Starting a second upgrade while one is still
  short of Live isn't "upgrading" (the author already has an edit option on
  that one, in Draft) - and a deletion request cascades across the *whole*
  family, so it's blocked while an upgrade is mid-flight (it would destroy
  unrelated in-progress work) and, symmetrically, a new upgrade is blocked
  while a deletion request is Pending on the family.
- **Deletion needs a fixed panel of exactly 1 editor + 1 reviewer + 1
  publisher, unanimously.** A single Reject cancels the whole request
  immediately (the other two votes stop mattering) rather than waiting out
  the remaining voters. The moment the 3rd Approve lands, the document -
  and every version in its family, not just the current one - is
  cascade-deleted in the same transaction. There is no separate "finalize"
  step anywhere in the API.
- **"Requests For Approval" is scoped strictly to requests where *that
  specific user* was assigned** - never every pending request at a phase,
  even for someone else holding the same role. Anything looser would leak
  who's-reviewing-what across people who happen to share a role.
- **The very first admin is seeded directly into the database**
  (`database/knex/seeds/001_roles_and_admin.js`, or the equivalent INSERTs
  at the bottom of the two plain-SQL files), never created through the API
  - promoting someone to admin requires an existing admin, so the very
  first one can't be created any other way. Change its password
  immediately after first login.
- **Two different "list all users" surfaces, on purpose.** `GET
  /users/all` is a lightweight, any-authenticated-user directory
  (id/name/email/role) - it's what every "Created By" / "Reviewer" /
  "Assigned By" column and every approver picker reads from. Full account
  detail (SSO ID, last login, active flag) stays behind `/admin/*`. Only
  an admin can delete a user - there is no peer-to-peer or self-delete
  anywhere in the API.
- **A real bug worth flagging for anyone extending this API:** `pg`
  returns `BIGINT` columns as JS strings by default, since a bigint can
  exceed `Number.MAX_SAFE_INTEGER`. Every id in this schema is `BIGINT`,
  and application code compares them with strict equality against
  `req.user.id` (a plain number decoded from the JWT) - `"7" !== 7` would
  silently break every single ownership check in the app. This was caught
  by actually running the full lifecycle against a live database while
  building this project (see `backend/tests/`), not just assumed safe.
  Fixed once, globally, in `backend/src/config/db.js` via
  `pg.types.setTypeParser(20, ...)`. If you ever add a raw `pg` client
  elsewhere without going through `config/db.js`, you'll need that same
  line again.

## Project structure

```
docflow/
├── README.md                        <- you are here
├── ProjectInfo.md                    <- the exhaustive reference: full flow, every design
│                                        decision and edge case, complete API reference,
│                                        every file's purpose, the editor integration in
│                                        full detail. Read this for anything not covered here.
├── Run_Project.md                    <- narrower, step-by-step "just get it running" guide
├── database/
│   ├── knex/
│   │   ├── migrations/              <- 16 files, run in order, Postgres-only (the app's real target)
│   │   └── seeds/                   <- 5 roles + 1 bootstrap admin
│   ├── postgres/schema.sql          <- the same schema, consolidated, plain SQL (no knex required)
│   └── mysql/schema.sql             <- a faithful (not byte-for-byte) MySQL equivalent, workarounds documented inline
├── backend/
│   ├── knexfile.js
│   ├── src/
│   │   ├── app.js, server.js        <- Express app assembly / entry point
│   │   ├── config/                  <- env.js, db.js (the BIGINT fix lives here)
│   │   ├── middleware/               <- authenticate, authorize, validate (zod), errorHandler, notFound
│   │   ├── utils/                    <- ApiError, ApiResponse, jwt, password, tokenHash, documentName, mailer, phaseWorkflow
│   │   ├── shared/constants/enums.js <- the one thing still under shared/
│   │   └── modules/
│   │       └── <name>/<name>.router.js|.service.js|.repository.js|.schema.js
│   │           (auth, users, admin, documents, draft, editorial, review, publication, live, deletion)
│   └── tests/                        <- 2 real end-to-end smoke-test scripts (curl + jq against a live server)
└── frontend/                         <- React app (Vite) - see the Frontend section
```

**Why `documents` is its own module, separate from the 5 phase modules:**
every phase module reads/writes `documents` for its own concerns (stage,
locking), but *creating*, *editing* (permission logic shared by every
phase), *fetching one* (Document Detail, with its visibility rules), *Dashboard's
"all of mine"*, and *deleting* are generic, phase-independent operations -
duplicating them per phase module would have meant four slightly-different
copies of the same permission check.

**Why every repository file takes `client` as its first argument:** either
the shared `db` connection or an active transaction (`db.transaction(async
trx => ...)`) - both expose the same `.raw(sql, bindings)` interface, so a
repository function never has to know or care whether it's part of a larger
atomic operation; the *service* layer decides that and passes the right
one in. This is also why multi-step writes (raising a request + inserting
N approver rows, resolving a decision + cascading a stage change, an
Upgrade's insert-then-set-root) are wrapped in `db.transaction(...)` at the
service layer rather than trusted to happen as separate, non-atomic calls.
The full logic for this - `utils/phaseWorkflow.js` - is described in
detail in `ProjectInfo.md`.

**Every response is `{ code, message, data }`** - `code` is the HTTP
status itself; there's no separate success boolean. See `ProjectInfo.md`
§6.4 for the exact mechanics and why the frontend never needs to read
`code` out of the body to know whether a call succeeded.

## Database

Three formats, all describing the same schema, kept in one folder on
purpose so they're never out of sync with each other:

1. **`database/knex/`** - what the backend actually runs
   (`npm run migrate`, `npm run seed`, from `backend/`).
2. **`database/postgres/schema.sql`** - the same schema as one plain SQL
   file, for standing up a database without knex at all
   (`psql -f database/postgres/schema.sql`). Verified by running it against
   a clean database while building this project.
3. **`database/mysql/schema.sql`** - a MySQL 8.0+ equivalent, for teams
   that must run on MySQL instead. **Not** a byte-for-byte port - three
   Postgres-only features have no MySQL equivalent, and each is worked
   around with a comment explaining the substitution, right where it
   happens:
   - Named `ENUM` types → inline `ENUM(...)` per column (repeated per
     column instead of one shared type).
   - `GENERATED BY DEFAULT AS IDENTITY` → `AUTO_INCREMENT`.
   - The partial unique index enforcing "at most one current version per
     document family" (`WHERE is_current = true`) has no MySQL equivalent,
     so it's replaced with a `STORED` generated column
     (`current_root_document_id`, NULL unless `is_current`) carrying a
     plain `UNIQUE` constraint instead - MySQL, like Postgres, allows
     unlimited NULLs through a unique index, so only two simultaneously-
     current rows for the same family actually collide. **This was tested
     against a real MySQL 8 instance while building this project**,
     including deliberately trying to violate it (confirmed rejected) and
     then performing the actual flip-then-insert publish sequence the app
     uses (confirmed it succeeds correctly).
   - `token_hash` columns are `VARCHAR(255)` instead of `TEXT`, since MySQL
     can't put a UNIQUE index on a bare TEXT column.

Only run **one** of migrations-via-knex or the plain-SQL file against a
given database, not both.

## Getting started

> **package-lock.json isn't committed in either `backend/` or `frontend/`.**
> Both previously contained one, but on inspection neither was a real,
> `npm`-generated lockfile — several pinned versions (e.g. a `lodash`
> release, a `cors` release) don't correspond to anything ever actually
> published to the npm registry, despite the file otherwise being
> structured like a normal lockfile (`resolved` URLs, `integrity`
> hashes). Whatever produced those files did not do so via a real `npm
> install` round-trip against the registry. Rather than leave a lockfile
> that falsely implies a specific, reproducible dependency tree, both
> were deleted — `npm install` will generate a genuine one for each
> package.json below on first run, which is also the only way to get an
> accurate `npm audit` (a fabricated lockfile can't tell you anything
> real about vulnerabilities one way or the other). Run `npm audit` in
> both `backend/` and `frontend/` after installing, and commit the
> lockfiles it produces.

```bash
# 1. Database (pick one)
psql -f database/postgres/schema.sql your_db          # plain SQL, or:
cd backend && npm install && npm run migrate && npm run seed   # knex

# 2. Backend
cd backend
cp .env.example .env         # then fill in DATABASE_URL etc.
npm install
npm run dev                  # http://localhost:4000

# 3. Log in as the seeded admin, change the password immediately
#    email: aditi.singh@docflow.admin   password: password
#    (4 more seeded demo accounts, one per remaining role, are listed in
#    ProjectInfo.md - all use the same placeholder password)

# 4. Run the integration tests (optional, requires a migrated+seeded DB and the server running)
npm test
```

## API reference

All routes are prefixed `/api/v1`. Every route except `auth/register`,
`auth/login`, `auth/refresh`, `auth/forgot-password`, and
`auth/reset-password` requires `Authorization: Bearer <accessToken>`.
Routes marked **(admin)** additionally require the admin role; routes
marked **(content)** require one of author/editor/reviewer/publisher
(i.e., not admin).

### Auth (`/auth`)
| Method & path | Purpose |
|---|---|
| `POST /register` | Self-service signup. Always creates an **author** - there is no role field here. |
| `POST /login` | Authenticate; returns an access token (short-lived JWT) + refresh token (opaque, stored hashed, rotated on use). |
| `POST /refresh` | Exchange a valid refresh token for a new access/refresh pair (rotation - the old one is revoked). |
| `POST /logout` | Revoke a refresh token. |
| `POST /validate` | Check whether an access token is currently valid, without throwing. |
| `GET /profile` | The caller's own profile. |
| `POST /forgot-password` | Always responds the same way whether or not the email exists. Emails a reset link (or logs it to the console if SMTP isn't configured - see `.env.example`). |
| `POST /reset-password` | Consumes a one-time reset token; revokes every outstanding refresh token for that user on success. |

### Users (`/users`) - lightweight, self-service
| Method & path | Purpose |
|---|---|
| `GET /all?role=` | Lightweight directory (id/name/email/role), optionally filtered. Powers every approver picker. |
| `GET /:user_id` | Lightweight profile of another user. |
| `PUT /me` | Update your own name/email. Role is never accepted here. |
| `PUT /me/password` | Change your own password (requires current password). |

### Admin (`/admin`) **(admin)**
| Method & path | Purpose |
|---|---|
| `GET /all` | Full detail on every user (SSO ID, last login, active flag, ...). |
| `GET /roles` | The 5 fixed roles. |
| `GET /:user_id` | Full detail on one user. |
| `POST /users` | **Add User** - create an account with any role directly (the one thing `register` can't do). |
| `PUT /:user_id` | Edit a user's basic info (name/email/SSO ID/active flag) - never role. |
| `PUT /role/:user_id` | The only way any user's role ever changes. |
| `DELETE /:user_id` | Soft-delete. The only way any user is ever deleted - there is no self- or peer-delete. |

### Documents (`/documents`) **(content, except GET)**
| Method & path | Purpose |
|---|---|
| `POST /new` | Doc Onboard: create at Draft, version 1. |
| `GET /all` | Dashboard: every document *I* authored, any stage. |
| `PUT /:document_id` | Edit title/content. Who may do this and when is enforced centrally (author in Draft/Rejected/Cancelled; assigned editor while Editorial-Pending) - see the Core Navigation Rule. |
| `GET /:document_id` | Document Detail, incl. stage history and an `author: {userId, fullName}` field. Live documents are public; anything else requires being the owner or an assigned approver. |
| `DELETE /:document_id` | Owner only, any status except Pending. |

### Draft (`/draft`) **(content)**
| Method & path | Purpose |
|---|---|
| `GET /all` | "My Documents": documents with no request ever raised. |
| `GET /editors` | Picker list for the Promote modal. |
| `POST /promote/:document_id` | Assign editor(s); raises the first Editorial request. |

### Editorial / Review (`/editorial`, `/review`) **(content)**
Identical shape, one phase apart:
| Method & path | Purpose |
|---|---|
| `GET /my-requests` | Documents I authored currently showing at this phase (any status). |
| `GET /for-approval` | Requests assigned to me specifically, resolved or not. |
| `GET /reviewers` (Editorial) / `GET /publishers` (Review) | Picker for promoting forward. |
| `POST /promote/:document_id` | Forward, once Approved (Editorial→Review / Review→Publication). |
| `POST /repromote/:document_id` | Re-raise at the *same* phase after Rejected/Cancelled. |
| `POST /cancel/:document_id` | Author cancels their own Pending request. |
| `POST /action/:document_id` | An assigned approver's Approve/Reject. Editorial's Approve/Reject can be combined with an edit (`PUT /documents/:id`) beforehand; Review's cannot (confirm-only). |

### Publication (`/publication`) **(content)**
| Method & path | Purpose |
|---|---|
| `GET /my-requests`, `GET /for-approval`, `GET /publishers` | Same shape as above. |
| `POST /repromote/:document_id` | Re-raise after unpublish. No plain `promote` here - Review's `promote` is what gets a document *into* Publication in the first place. |
| `POST /cancel/:document_id` | Author cancels their own Pending request; reverts to Review. |
| `POST /action/:document_id` | The terminal decision. Approved = publish immediately (documents.stage → LIVE, is_locked → true, a document_live row is created). Rejected = unpublish (stage stays Publication - see [design decisions](#design-decisions--edge-cases-resolved)). |

### Live (`/live`) **(GET /feed: any role; rest: content)**
| Method & path | Purpose |
|---|---|
| `GET /feed` | **Home**: every current live document, every author. Public within the app - every role, admin included. |
| `GET /all` | **Live** (personal): only *my* current live documents. |
| `POST /upgrade/:document_id` | Clone a new, editable version into Draft (title/content editable, category fixed). Blocked if another version is already in flight, or a deletion request is Pending. |

### Deletion (`/deletion`) **(content)**
| Method & path | Purpose |
|---|---|
| `GET /my-requests` | Deletion requests I raised. |
| `GET /for-approval` | Requests where I'm one of the 3 assigned approvers. |
| `POST /request/:document_id` | Author requests deletion of their own live document: a reason plus exactly one editor, one reviewer, one publisher. |
| `POST /cancel/:delete_request_id` | Author cancels their own Pending request. |
| `POST /action/:delete_request_id` | One of the three assigned approvers votes. A single Reject cancels the whole request. The 3rd Approve cascade-deletes the entire document family in the same transaction. |

## Frontend

React (Vite) + Tailwind CSS v4, in `frontend/`. `ProjectInfo.md` §9-§12
has the exhaustive version (every route, every context, the full design
system, the editor integration in detail) - the short version:

- **Role-conditional navigation.** Content roles (author/editor/
  reviewer/publisher) get Home, Dashboard, Doc Onboard, Draft, Editorial,
  Review, Publication, Live, Deletion; admin gets Home and Users only.
  The account's role is shown in the header's profile menu, not as a
  sidebar section label.
- **Light/dark theme and a collapsible sidebar**, both user-toggled and
  persisted (`ThemeContext`, `SidebarContext`). Colors are semantic CSS
  custom properties, redefined per-theme in one place, so individual
  components never need theme-specific classes.
- **A public `Landing` page at `/`**, and a distraction-free, full-page
  `DocumentReader` at `/read/:id` (no sidebar/header) for reading a
  document - separate from the in-context `DocumentDetailModal` used
  everywhere else.
- **A shared filter/sort system** (`lib/filters.js`, `lib/sort.js`,
  `components/ui/FilterPanel.jsx`) that every list page wires up the
  same way, replacing per-page ad-hoc filtering.
- **Editorial/Review/Publication's "My Requests" and "Requests For
  Approval" tabs**, and the promote/repromote/cancel/decide actions, all
  render through the same small set of reusable components
  (`PromoteModal`, `ApproverActionModal`) parameterized by props, mirroring
  how the backend avoids re-implementing the same logic three times.
- **The provided rich text editor is integrated wholesale**
  (`frontend/src/components/editor/`) - it already deals in HTML strings
  natively (`initialValue` in, sanitized HTML out via `onChange`), which
  is exactly the "content as HTML in the database" contract this app
  needs. Two small, additive props (`readOnly`, `syncTheme`) were later
  added to its core files specifically to support the read-only
  `DocumentContentViewer` used by `DocumentReader` and
  `DocumentDetailModal` - everything else in the editor is exactly as
  supplied. Full detail in `ProjectInfo.md` §10.
- Verified with a full production build (zero errors across every
  module) and by cross-checking real API response shapes from the
  running backend against every field the frontend actually reads - see
  `ProjectInfo.md` §13 for what a real browser-based E2E pass would need
  that wasn't available in the environment this was built in.

```bash
cd backend && npm run dev     # http://localhost:4000
cd frontend && npm run dev    # http://localhost:5173 (proxies /api to the backend above)
```