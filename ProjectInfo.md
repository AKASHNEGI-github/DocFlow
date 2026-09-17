# DocFlow — Complete Project Information

This document is the single, exhaustive reference for the DocFlow project.
It exists so that anyone — a new engineer, a reviewer, a future version
of an AI assistant, anyone — can read this one file and understand
*everything*: what the application does, why every non-obvious decision
was made the way it was, exactly how the backend and frontend are built,
every API endpoint and what it does, every page and component and its
purpose, how the embedded rich-text editor works and how it's wired in,
and where the current code stands relative to earlier design decisions.

Nothing here should require asking a follow-up question. Where the
current code deviates from an earlier design decision (the project went
through more than one round of changes), that is called out explicitly
rather than smoothed over.

## Table of contents

1. [What DocFlow is](#1-what-docflow-is)
2. [Roles](#2-roles)
3. [The document lifecycle, in full](#3-the-document-lifecycle-in-full)
4. [The Core Navigation Rule](#4-the-core-navigation-rule)
5. [Every design decision and edge case, and why](#5-every-design-decision-and-edge-case-and-why)
6. [Backend architecture](#6-backend-architecture)
7. [Complete API reference](#7-complete-api-reference)
8. [Database](#8-database)
9. [Frontend architecture](#9-frontend-architecture)
10. [The embedded editor, in full](#10-the-embedded-editor-in-full)
11. [Every frontend page and component, and its purpose](#11-every-frontend-page-and-component-and-its-purpose)
12. [Design system (colors, typography, dark mode)](#12-design-system-colors-typography-dark-mode)
13. [Known inconsistencies, dead code, and open items](#13-known-inconsistencies-dead-code-and-open-items)
14. [Running the project](#14-running-the-project)

---

## 1. What DocFlow is

DocFlow is a document publishing/workflow platform. A document does not go
live the moment someone writes it — it earns its way there through a
fixed pipeline, each stage handed off to a different role, like a docflow
race passing a baton:

```
Draft → Editorial → Review → Publication → Live
```

Alongside that forward pipeline there is one more flow, **Deletion**,
which is how a *Live* document is ever taken down again — it requires
unanimous sign-off from three different people (one editor, one
reviewer, one publisher), not just the original author's say-so.

The people who use the system fall into five roles (see below). Four of
them can author documents and can also be asked to approve other
people's documents at a specific stage; the fifth (admin) manages user
accounts and does not touch documents at all.

The whole system was designed conversation-first: every rule below was
explicitly discussed, decided, and in several cases *revised* once a
consequence of an earlier decision surfaced later. This document is
written with that history in mind — not just "what the rule is" but
"what it used to be, and why it changed," wherever that happened.

---

## 2. Roles

Five fixed roles. They are seeded once into the `roles` table and are
never created or deleted through the API — only user accounts are.

| role_id | role_name | Can author documents? | Also acts as an approver at… |
|---|---|---|---|
| 1 | **author** | Yes | — (this is just the default role every new account starts with) |
| 2 | **editor** | Yes | Editorial stage; one of the 3 Deletion approvers |
| 3 | **reviewer** | Yes | Review stage; one of the 3 Deletion approvers |
| 4 | **publisher** | Yes | Publication stage; one of the 3 Deletion approvers |
| 5 | **admin** | **No** | Never — admin has no document permissions at all |

**The most important, easy-to-miss fact about roles:** *"author" is not
a gate on who is allowed to author documents.* It is just the name of
the role every self-registered account defaults to. **Any of the first
four roles — author, editor, reviewer, or publisher — can create a
document.** An editor can write their own document and send it through
the same pipeline as anyone else's; when it reaches the Editorial stage,
some *other* editor (or even themselves, see below) is asked to approve
it.

Because of this, a user's account role is really only used for two
things:

1. Deciding which picker lists (the "assign an editor / reviewer /
   publisher" dropdowns) a person's name shows up in, and which admin
   screens they can reach.
2. Document *ownership* — who may edit/promote/cancel/delete/upgrade a
   specific document — is tracked per-document, via `documents
   .created_by`, and is completely independent of the owner's current
   account role. Ownership never changes, even if an admin changes that
   person's role later.

**Self-assignment is allowed.** When an editor is promoting their own
document, they can pick themselves from the editor list to approve it.
Same for a reviewer and a publisher at their respective stages. This was
an explicit, deliberate decision (not an oversight) — the reasoning
discussed was that requiring a *different* editor purely for the sake of
it would be needless friction for small teams, and nothing about the
approval's integrity actually depends on the approver being a different
person from the author.

**Admin cannot author documents at all.** It has its own separate area
(User Management) and, in the current UI, can also browse the public
Home feed like everyone else, but it never sees Draft, Editorial,
Review, Publication, Live, or Deletion as its own action screens.

---

## 3. The document lifecycle, in full

### 3.1 Doc Onboard (creation)

Any of the four content roles creates a document with:
- **Category** — free text today (a managed, admin-curated category list
  was discussed as a natural next step, but deliberately deferred — see
  §5).
- **Title** — the human-facing name.
- **Content** — rich HTML, written in the embedded editor (see §10).

On creation: `version_no = 1`, `stage = DRAFT`, and the document's
internal `document_name` is composed as `"V1 - {title}"` (see §5 for why
this composite, rather than a plain title column, is what's actually
stored and kept unique).

### 3.2 Draft

The document sits in the author's **"My Documents"** list — a single,
untabbed list, because there is no approver role at the Draft stage for
a My-Requests/For-Approval split to mean anything. From here the author
can View, Edit (title/content — category is fixed once a document
exists), Delete, or **Promote**.

**Promote** opens a picker of one or more people holding the **editor**
role. Submitting it:
- Creates a new `editorial_requests` row, status **Pending**.
- Immediately advances `documents.stage` to `EDITORIAL` (the document's
  *structural* stage moves the instant a request is raised — not only
  once someone approves it; see §4 for why this matters).
- Logs the transition to `document_stage_history`.

### 3.3 Editorial

Two tabs everywhere from here on: **My Requests** (documents *I*
authored that are currently showing at this phase) and **Requests For
Approval** (requests where *I specifically* was one of the assigned
approvers — never every pending request at the phase, even for someone
else holding the same role; this was an explicit privacy decision, see
§5).

An assigned **editor**, while the request is Pending, can:
- **Edit** the document's title/content — independently of their
  decision. This is the one place in the whole pipeline where an
  approver (not the author) can edit content. It was a deliberate
  design choice: "author creates, editor edits and approves, reviewer
  only confirms, publisher only publishes" — each of the three approver
  roles does a genuinely different job.
- **Approve** — moves the document on to Review. `documents.stage`
  stays `EDITORIAL` (it's already there).
- **Reject** — sends it back. `documents.stage` reverts to `DRAFT`.

Whichever assigned editor acts **first** decides the outcome for
everyone (see §5, "first-responder-wins").

The author, meanwhile, sees the document in their own **My Requests**
tab with different actions depending on status:
- **Pending** → View, Cancel.
- **Approved** → View, **Promote** (opens a reviewer picker, raises a
  `review_requests` row, advances stage to `REVIEW`), Delete.
- **Rejected** or **Cancelled** → View, **Edit**, **Promote again**
  (re-raises a *brand-new* editorial request — never reuses/updates the
  old one, see §5 — advancing stage back to `EDITORIAL`), Delete.

### 3.4 Review

Structurally identical to Editorial, one phase further along, with one
real difference: **the reviewer never gets an Edit action.** Confirm
only. Approve moves the document on to Publication (raises
`publication_requests`, stage → `PUBLICATION`). Reject sends it back to
Editorial (stage reverts to `EDITORIAL`).

### 3.5 Publication — the special one

This is the terminal decision point, and it behaves differently from
Editorial/Review in two ways that were both explicitly discussed and
decided:

1. **A publisher's Approve *is* the live action.** There is no separate
   "promote to Live" step. The moment a publisher approves:
   - `documents.stage` → `LIVE`.
   - `documents.is_locked` → `true` (no further edits are ever possible
     on this specific document row again — the *only* way to change a
     live document afterward is **Upgrade**, which creates a whole new
     version, see §3.6).
   - A `document_live` row is inserted for this version.
2. **A publisher's Reject means "Unpublish," and does *not* revert the
   stage.** `documents.stage` stays at `PUBLICATION`. This is
   deliberately different from every other Reject in the pipeline. The
   reasoning: an editor's or reviewer's reject means the *content*
   wasn't good enough and needs to go back a step to be fixed and
   re-earn that stage's approval. A publisher's reject means the
   content was never in question — Editorial and Review already signed
   off on it — the publisher just isn't ready to make it public yet. Re-
   raising it (picking a fresh set of publishers) doesn't need the
   content to be re-reviewed, so it stays at Publication rather than
   being bounced back to Review.

The author can **Cancel** a still-Pending publication request (this
*does* revert the stage, back to `REVIEW` — cancelling is the author's
own choice to abort the promotion attempt entirely, unlike a publisher's
reject which is a considered "not yet" on an already-approved document).

### 3.6 Live

A **public** area — every live document, from every author, is visible
to every authenticated user of the app, admin included (this is the
**Home** feed). Each author additionally has a personal **Live** page
showing only documents whose *current version* they themselves created.

From their own Live document, the author can:
- **Upgrade** — clones a *new* `documents` row (`stage = DRAFT`,
  `version_no + 1`, `parent_document_id`/`root_document_id` pointing
  back into the family), pre-filled with the current live content.
  Category is carried over and fixed; title/content are editable. The
  live document itself is completely untouched during this — it keeps
  serving exactly what's published until the new version independently
  earns its own way through the *entire* pipeline again and is itself
  approved to publish. Blocked if another version of the same family is
  already in flight anywhere Draft→Publication, and blocked if a
  Deletion request is currently Pending on this document (see §5 for
  why these two are mutually exclusive).
- **Request deletion** — see §3.7.

Only the **current** version of a document family is ever "live" at
once. When a new version publishes, the previous current version's
`document_live` row is flipped to `is_current = false` in the same
transaction that inserts the new current row (see §8 for how this is
enforced at the database level in both Postgres and MySQL).

### 3.7 Deletion

Its own phase, with the same My Requests / Requests For Approval tab
shape as Editorial/Review/Publication, but a fundamentally different
approval rule: **unanimous**, not first-responder-wins.

The author requests deletion of one of their own live documents with a
required **reason**, plus **exactly one** editor, one reviewer, and one
publisher (not "one or more" — precisely one of each, a fixed panel of
three named individuals). All three must independently **Approve**. A
single **Reject** from any of the three cancels the whole request
immediately — the other two votes, cast or not, stop mattering.

The moment the **third** Approve lands: the document, **and every other
version in the same document family** (not just the currently-live
one — including any abandoned draft attempts that never finished their
own trip through the pipeline), is soft-deleted, all in the same
database transaction as that final vote. There is no separate "finalize
deletion" step anywhere in the system — the third approval *is* the
deletion.

If the request was instead rejected (cancelled by one no vote), the
author can raise a **fresh** deletion request afterward (a new
`delete_request_id`, not a resurrection of the old one) — the document
was never actually touched while the vote was happening.

---

## 4. The Core Navigation Rule

This is the single idea that makes the rest of the system's display
behavior consistent, and it was the hardest thing to get exactly right
during design — worth reading closely.

> **A document's *displayed* phase is always whichever of
> `editorial_requests` / `review_requests` / `publication_requests`
> holds the single most recent row for that document — regardless of
> that row's status.** `documents.stage` is a *separate*, purely
> structural field. It only gates what's *allowed* right now (can this
> be edited? is it locked?) — it does **not** decide which phase-tab a
> document is shown under in the UI.

Why two separate concepts are needed at all: `documents.stage` advances
the instant a request is *raised* (Pending), not only once it's
approved — and it can *revert* (Editorial's reject sends it back to
`DRAFT`; Review's reject sends it back to `EDITORIAL`). But a rejected
document still needs to *display* at the phase it was just rejected
at — with a "Promote again" action sitting right there — not get
silently bounced back down to a screen that no longer has any obvious
button to fix the problem. If the UI only looked at `documents.stage`,
a just-rejected document would vanish from Editorial's list and
reappear in Draft's list with no visible way to see *why* it was
rejected or to act on it directly.

So instead, every phase-list query is driven by a shared SQL building
block (`LATEST_PHASE_REQUEST_CTE` in
`backend/src/utils/phaseWorkflow.js`) that unions all three request
tables together and picks, per document, the single overall latest row
by `created_at` — whichever table that row is in *is* the phase the
document displays under, and that row's `status` is the status shown.

**Concrete example:** a document gets rejected at Editorial.
`documents.stage` reverts to `DRAFT`. But its latest row is still in
`editorial_requests`, with `status = REJECTED`. So:
- It does **not** appear in Draft's "My Documents" list (Draft's list is
  specifically "no request has ever been raised at all" — see §5).
- It **does** appear in Editorial's "My Requests" tab, with a Rejected
  badge and a "Promote again" button.
- Internally, `documents.stage = DRAFT` is what makes the document
  editable again and what a fresh `editorial/repromote` call will
  advance forward from.

Both facts are true and correct at the same time; they just answer two
different questions ("what state is this document structurally in" vs.
"where does a human look to find it and act on it").

**The one deliberate exception:** Publication's Reject (Unpublish) does
**not** cause this kind of divergence in the same way, because it
doesn't revert `documents.stage` either — see §3.5.

**Re-raising is always a brand-new row.** Whether it's Editorial,
Review, or Publication, a "Promote again" after Rejected/Cancelled never
updates the old request row in place — it inserts an entirely new one.
The old, resolved row is left untouched as permanent history. This is
also why "current status at a phase" is *defined* as "the latest row,"
rather than there being a separate status column on `documents` that
gets overwritten — overwriting would destroy the history a re-raise is
specifically designed to preserve.

---

## 5. Every design decision and edge case, and why

This section is the accumulated record of every non-obvious rule in the
system, in the order they tend to come up, with the reasoning behind
each — including the handful that were *changed* mid-design once a
consequence became clear.

### 5.1 Approval mechanics

- **First-responder-wins, except Deletion.** At Editorial, Review, and
  Publication, one or more people can be assigned as approvers
  specifically *so that* whichever one gets to it first can act without
  waiting on or blocking the others — the first decision (Approve or
  Reject) resolves the request for everyone. Deletion is the deliberate
  exception: it needs a fixed panel of exactly one editor, one reviewer,
  and one publisher, and needs **all three** to Approve (a single Reject
  ends it immediately) — because taking a live, public document down is
  considered a bigger, more deliberate decision than moving it one step
  forward in an already-reversible pipeline.
- **Other assigned approvers' rows are left untouched, not auto-
  resolved.** When one editor approves a request three editors were
  assigned to, the *request's* status flips to Approved, but the other
  two editors' individual approver rows are deliberately left at
  Pending — never rewritten to match, since they didn't actually act.
  The request's own status is the single source of truth for "resolved
  or not"; a resolved request simply stops appearing as actionable in
  everyone else's Requests For Approval list.
- **Race-condition guard.** The database row for the request being
  acted on is locked (`SELECT ... FOR UPDATE`) inside the same
  transaction as the decision, so if two assigned approvers submit a
  decision at almost the same instant, the second one to actually commit
  sees "this request was already resolved" rather than silently
  overwriting the first decision.
- **Deletion's per-person vote guard is different and additional:**
  because all three people act independently rather than racing to be
  first, the system also checks that *this specific person's own*
  approver row is still Pending before accepting their vote — otherwise
  someone could vote twice.
- **"Requests For Approval" is scoped strictly to that person.** It was
  explicitly decided this must never show every pending request at a
  phase to everyone who holds that role — only requests where *that
  specific user* is named as an assigned approver. Anything looser was
  considered a real privacy leak (letting one editor see what's sitting
  in front of a colleague).

### 5.2 Editing rights

- **Author edits:** in Draft (before any promotion), and after a
  Rejected or Cancelled outcome at *any* phase. Never while Pending or
  Approved-but-not-yet-promoted.
- **Editor edits:** only while their editorial request is Pending, and
  only if they are one of the assigned approvers on it — independent of
  whether they've made their Approve/Reject decision yet. This was a
  deliberate late addition, reasoned through explicitly: "even if editor
  edit or not, it will not affect stage and status" — editing and
  deciding are two separate actions on the same screen, not a combined
  step.
- **Reviewer and publisher never get an edit action, anywhere.** This is
  intentional, not a missing feature — each of the three approver roles
  was designed to do one distinct job (edit, confirm, publish); giving
  all three edit rights would make the roles redundant with each other.
- **Locking.** `documents.is_locked` becomes true the instant a document
  goes Live, and from that point the document is permanently
  uneditable — the *only* path to changing its content afterward is
  Upgrade, which is a distinct new document row, not an edit of the
  locked one.

### 5.3 Delete

- **Deletable at every status except Pending.** None, Approved,
  Rejected, and Cancelled can all be deleted directly by the author; a
  Pending request must be Cancelled first. This was refined during
  design — an earlier version of the rule considered excluding Approved
  too, but that was corrected: once approved, nothing is outstanding,
  and the author is simply choosing not to promote it further, so
  there's no reason to block deletion.
- **Live documents are never deleted via the plain document-delete
  endpoint at all.** Taking a live document down is exclusively the
  separate, stricter, three-approver Deletion flow described in §3.7.

### 5.4 Naming and uniqueness

- **`document_name` is the composite `"V{version} - {title}"`, and
  that's what's actually UNIQUE — not the title alone.** A plain
  `UNIQUE(title)` constraint could never coexist with the versioning
  design: an Upgrade deliberately clones the *same* title into a
  brand-new `document_id`, which a bare title-uniqueness rule would
  reject outright the moment a second version tried to save. The
  composite name lets `"V1 - Transformers"` and `"V2 - Transformers"`
  both exist as distinct, valid, unique rows for the same conceptual
  document, while still preventing two *unrelated* new documents from
  both claiming `"V1 - Transformers"`.
- The plain title is recovered anywhere it's needed (edit-form
  pre-fills, composing the *next* version's name during an Upgrade) by
  stripping the fixed `"V{n} - "` prefix — a prefix that is always
  system-generated, never something a user types, so the strip is safe.
- **Category is plain free text for now**, deliberately deferred rather
  than a managed lookup table with an admin-curated list and a
  dropdown — a reasonable near-term enhancement that was explicitly
  scoped out of the initial build.

### 5.5 Versioning and the Upgrade/Deletion relationship

- **Versioning is done by cloning into a new `document_id`, not by
  bumping a version number in place on the same row.** Every version of
  a document family shares a `root_document_id` (the original v1's own
  id) and points to its immediate predecessor via `parent_document_id`.
- **Only the current version of a family is ever live.** Enforced by a
  database constraint (a partial unique index on Postgres; a generated-
  column workaround on MySQL — see §8), not just application logic, so
  it's structurally impossible for two versions of the same family to
  both be marked current even if a bug somewhere forgot to flip the old
  one.
- **One upgrade in flight per family, and Upgrade/Deletion are mutually
  exclusive, in both directions.** Starting a second upgrade while the
  first hasn't reached Live yet isn't really "upgrading" — the author
  already has a plain Edit option on that first one while it's still in
  Draft. And because an approved Deletion cascades across the *entire*
  family (not just the current version — see §3.7), it's blocked while
  an upgrade is mid-flight (approving it would destroy unrelated,
  unfinished work), and symmetrically, starting a *new* upgrade is
  blocked while a deletion request is Pending on the family (so the
  in-flight upgrade can't itself become collateral damage to a deletion
  that resolves later).

### 5.6 Admin and users

- **The very first admin account is seeded directly into the database**
  (`database/knex/seeds/001_roles_and_admin.js`, or the equivalent
  `INSERT`s at the bottom of the two plain-SQL schema files) — never
  created through the API. This is a structural necessity, not a
  preference: promoting a user to admin requires an *existing* admin to
  do it, so the very first one has no other way to come into existence.
  **Change its seeded password immediately after first login** (see §14
  for the exact seeded credentials and why they're safe to publish).
- **Two intentionally different "list users" surfaces.** `GET
  /users/all` is a lightweight, any-authenticated-user directory
  (id/name/email/role only) — this is what every "Created By,"
  "Reviewer," "Assigned By" column and every approver picker actually
  reads from. Full account detail (SSO ID, last login, active flag,
  audit timestamps) stays behind the privileged `/admin/*` routes.
- **Only an admin can delete a user — there is no self-delete or peer-
  delete anywhere in the system.** `DELETE /users/:id` was considered
  and explicitly removed from the design; deletion is exclusively
  `DELETE /admin/:user_id`.
- **User deletion is a soft delete (deactivation), not a hard row
  delete.** The row is kept (with `is_deleted = true`, `is_active =
  false`) because other tables (documents.created_by, request
  approvers, stage history) still need somewhere valid to point for
  historical/audit purposes. Every outstanding refresh token for that
  account is also revoked in the same action, so any currently-logged-in
  session for that user is immediately logged out rather than staying
  valid until its access token naturally expires a few minutes later.
- **Admin never authors documents and has no per-document permissions**
  — its only capabilities are user management, plus read-only access to
  the public Home feed (since Home is "visible to every user of the
  application," and admin is a user of the application too).

### 5.7 Auth

- **Self-registration always creates an author, with no admin
  activation step.** A brand-new account can create and promote
  documents immediately after registering.
- **Access tokens are short-lived JWTs; refresh tokens are opaque,
  random, stored only as a hash, and rotated on every use.** A refresh
  token is never itself a JWT — it's a long random string the client
  holds and the server can individually revoke, distinct from the
  stateless access token. Rotation means a stolen-and-reused refresh
  token becomes detectable: presenting it again after it's already been
  rotated away simply fails, because the lookup finds it already
  revoked.
- **Forgot password / reset password** were added later in the design
  process (there was a brief point where they were deferred, then
  explicitly reinstated with "Yes forgot password will be there and
  also have to make api to reset password"). The reset flow: request a
  reset → a one-time, hashed, time-limited token is generated and
  emailed (or, with no SMTP configured, logged to the server console so
  the whole flow is runnable with zero external setup) → consuming it
  sets a new password and revokes every other outstanding refresh token
  for that account, logging out every other active session.
- **No SSO, no email verification.** Both were explicitly considered and
  declined for this build (the `sso_id` column exists in the schema for
  future flexibility, but no SSO login flow was built against it).

### 5.8 What changed about "some API may be updated" (the second build pass)

The functional API surface (every route, method, and path) is
**unchanged** from the original design. What *did* change, in the pass
that produced the code this document describes:

- **The response envelope shape.** Originally every response was `{
  success: boolean, message, data }` (errors additionally carried a
  `details` field). It is now **`{ code, message, data }`** for *every*
  response, success or failure — `code` is the HTTP status code itself,
  and there is no separate boolean at all. See §6.4 for the exact
  mechanics and why the frontend doesn't need to read `code` to know
  whether a call succeeded.
- **`GET /documents/:document_id` (Document Detail) now includes an
  `author: { userId, fullName }` field** it didn't originally carry —
  added via a join in the repository layer, consumed directly by
  `DocumentReader.jsx`'s byline and `DocumentDetailModal.jsx`'s "By
  {name}" line.
- **`ApiError` gained several factory methods that weren't originally
  present** — `gone` (410), `unprocessable` (422), `tooManyRequests`
  (429), `serviceUnavailable` (503) — available for any future route
  that needs them, alongside the original badRequest/unauthorized/
  forbidden/notFound/conflict/internal.
- **The backend's internal folder layout was flattened.** The reference
  implementation (`knex_repository/`, kept only as an unused, unmodified
  archive of an earlier query-builder-style draft of the repository
  layer) was removed entirely, and `shared/middleware/` and
  `shared/utils/` were moved up to plain `middleware/` and `utils/` — see
  §6.2 for the current, accurate structure. `shared/constants/enums.js`
  is the one thing that stayed under `shared/`.

No business logic, permission rule, or state-machine behavior changed in
this pass — every rule in §3, §4, and §5.1–5.7 above still describes
the system exactly as it currently behaves; this was independently
re-verified against the actual current code while writing this document,
not assumed to still be true from an earlier description.

---

## 6. Backend architecture

### 6.1 Tech stack

- **Runtime/framework:** Node.js (ESM — `"type": "module"` throughout),
  Express 4.
- **Database:** PostgreSQL, accessed through **knex** — but knex is used
  purely as the connection pool, transaction manager, and migration
  runner, **not** as a query-builder DSL. Every actual query in every
  repository file is raw, parameterized SQL via `client.raw(sql,
  bindings)`. This was an explicit, corrected decision during design: an
  early draft of the repository layer used knex's fluent `.where()
  .insert()` builder API, which was flagged as not matching what was
  actually wanted; those files were preserved rather than thrown away
  (see §13) and every real repository file was rewritten in raw SQL.
- **Validation:** `zod` schemas, one `<module>.schema.js` per module,
  applied by a shared `validate()` middleware that parses and replaces
  `req.body`/`req.params`/`req.query` before the handler ever runs.
- **Auth:** `jsonwebtoken` for short-lived access tokens; refresh tokens
  are hand-rolled opaque random strings (via Node's `crypto`), hashed
  with SHA-256 before storage — not JWTs, and not bcrypt (bcrypt's slow,
  salted design is for low-entropy human passwords; these tokens are
  already high-entropy random values, so a fast deterministic hash is
  the correct tool for "look this up by its hash").
- **Passwords:** `bcryptjs`.
- **Email:** `nodemailer`, with a built-in fallback: if `SMTP_HOST`
  isn't configured, the forgot-password email is logged to the server
  console instead of failing, so the whole flow works out of the box
  with zero external setup.
- **Everything else:** `cors`, `helmet`, `morgan` for standard Express
  hardening/logging.

### 6.2 Folder structure (current, accurate)

```
backend/
├── knexfile.js                   knex config - points at database/knex/{migrations,seeds}
├── package.json
├── .env.example
├── src/
│   ├── app.js                    Express app assembly: helmet, cors, json body parsing,
│   │                             morgan, mounts every module's router under /api/v1,
│   │                             then notFound + errorHandler last.
│   ├── server.js                 Entry point - imports app.js, calls app.listen().
│   ├── config/
│   │   ├── env.js                Centralized env var loader/typing.
│   │   └── db.js                 The single shared knex instance every repository
│   │                             file imports. ALSO where a critical driver-level fix
│   │                             lives - see the callout box below.
│   ├── middleware/
│   │   ├── authenticate.js       Verifies the Bearer access token, sets req.user = {id, role}.
│   │   ├── authorize.js          Route-level role gate: authorize('admin'), authorize(...CONTENT_ROLES).
│   │   ├── validate.js           Runs a module's zod schema against body/params/query.
│   │   ├── errorHandler.js       Central error → { code, message, data } response formatter.
│   │   └── notFound.js           Catch-all 404 for unmatched routes.
│   ├── utils/
│   │   ├── ApiError.js           Named, throwable HTTP errors (badRequest, unauthorized, ...).
│   │   ├── ApiResponse.js        The { code, message, data } envelope builder - see §6.4.
│   │   ├── asyncHandler.js       Wraps async route handlers so rejections reach errorHandler.
│   │   ├── jwt.js                Sign/verify access tokens.
│   │   ├── password.js           bcrypt hash/compare.
│   │   ├── tokenHash.js          Opaque-token generation + SHA-256 hashing (refresh & reset tokens).
│   │   ├── documentName.js       compose/parse "V{n} - {title}" <-> document_name.
│   │   ├── mailer.js             sendMail() with the console-log fallback when SMTP is unset.
│   │   └── phaseWorkflow.js      Shared Editorial/Review/Publication logic - see §6.6.
│   └── shared/
│       └── constants/
│           └── enums.js          ROLES, CONTENT_ROLES, DOCUMENT_STAGE, REQUEST_STATUS,
│                                 RE_PROMOTABLE_STATUSES, DELETABLE_STATUSES,
│                                 APPROVER_ACTION, DELETE_APPROVER_ROLE.
│   └── modules/
│       └── <name>/
│           ├── <name>.router.js       Express route definitions - thin, no business logic.
│           ├── <name>.service.js      All business logic + permission checks + workflow steps.
│           ├── <name>.repository.js   Raw parameterized SQL only. Every function's first
│           │                         argument is `client` (see the callout box below).
│           └── <name>.schema.js       zod validation for that module's request bodies/params.
│       (10 modules: auth, users, admin, documents, draft, editorial,
│        review, publication, live, deletion)
└── tests/
    ├── smoke_test_1_full_lifecycle.sh    Real end-to-end curl+jq test against a live server:
    │                                     the entire happy-path pipeline plus every
    │                                     concurrency guard.
    ├── smoke_test_2_reject_cancel_reset.sh   Reject/cancel/revert paths, password reset,
    │                                         admin role changes, the not-an-assigned-
    │                                         approver guard.
    └── README.md
```

> ### Two things every reader of this backend needs to know before touching anything
>
> **1. `pg` returns `BIGINT` columns as JavaScript strings, by default.**
> Every primary/foreign key in this schema is `BIGINT`. Application code
> everywhere compares them with strict equality against `req.user.id` (a
> plain JS number decoded from the JWT) — `"7" !== 7`. Left unfixed, this
> silently breaks *every single ownership and assignment check in the
> entire app* (a document's real owner would be told "only the author can
> do this"). It is fixed exactly once, globally, in
> `backend/src/config/db.js`:
> ```js
> pg.types.setTypeParser(20, (value) => parseInt(value, 10));
> ```
> (`20` is Postgres's internal OID for `int8`/bigint.) This is safe here
> because no id in this schema will ever remotely approach
> `Number.MAX_SAFE_INTEGER` (~9 quadrillion). **If a raw `pg` client is
> ever created anywhere else in this codebase without going through
> `config/db.js`, that same line needs to be added again**, or ownership
> checks against ids coming from that connection will silently misbehave
> exactly like this originally did. This was found by actually running
> the full pipeline against a live database while the backend was being
> built, not by inspection — it's the kind of bug that produces no error
> at all, just a wrong `true`/`false`.
>
> **2. Every repository function's first parameter is `client`** — either
> the shared `db` connection (`config/db.js`) for a single standalone
> statement, or an active transaction (`db.transaction(async trx => …)`)
> when several statements must commit or roll back together. Both expose
> the identical `.raw(sql, bindings)` method, so a repository function
> never needs to know or care which one it was handed — the *service*
> layer decides transaction boundaries and passes the right one in. This
> is why raising a request (insert the request row + insert N approver
> rows), resolving a decision (update the approver row + update the
> request row + advance/revert `documents.stage` + log stage history),
> and an Upgrade (insert the new document row, then a second statement to
> set its `root_document_id`) are all wrapped in `db.transaction(...)` at
> the service layer, rather than trusted to happen as separate,
> non-atomic calls that could partially fail.

### 6.3 The module pattern

Every one of the 10 modules follows the identical four-file shape:

- **`<name>.router.js`** — pure Express routing. Applies
  `authenticate`/`authorize` middleware, runs `validate(schema)`, calls
  exactly one service method, and formats the response via
  `ApiResponse.ok/created`. Contains no business logic at all.
- **`<name>.service.js`** — where every permission check and every
  multi-step workflow actually lives. Every non-trivial method has an
  explicit `Workflow -` comment block spelling out its numbered steps,
  by design (so the reasoning is visible directly next to the code that
  implements it, not only in a separate document like this one).
- **`<name>.repository.js`** — raw SQL only, one function per distinct
  query/statement, always taking `client` first.
- **`<name>.schema.js`** — zod object(s) grouped by request part
  (`{ params, body, query }`), one exported per route that needs
  validation.

**Why `documents` is its own module, separate from the 5 phase
modules:** every phase module reads/writes `documents` for its own
narrow concerns (advancing/reverting `stage`, checking `is_locked`), but
*creating* a document, *editing* it (one permission check shared by
every phase, rather than four slightly different copies of it),
*fetching one* (Document Detail, with its visibility rule), the
*Dashboard's* "all of mine, any stage" list, and *deleting* are generic,
phase-independent operations that belong in one place.

### 6.4 The response envelope and error handling

**Every** response from the API — success or failure — has the exact
same shape:

```json
{ "code": 200, "message": "OK", "data": { /* ... or null ... */ } }
```

`code` is always the HTTP status code that was also sent as the actual
response status (200/201 for success; 400/401/403/404/409/etc. for
errors). There is **no** separate boolean success flag anywhere in the
payload — the frontend determines success purely from `fetch`'s own
`response.ok` (true for any 2xx status), never by inspecting the body.
On an error, `data` carries whatever extra structured detail the error
included (e.g. zod's per-field validation issues) — it is `null` when
there's nothing more to say than the message itself.

This is built from three pieces working together:

- **`ApiError`** (`utils/ApiError.js`) — a throwable class with a
  `statusCode`, a `message`, and optional `details`, plus one static
  factory per common HTTP status: `badRequest` (400), `unauthorized`
  (401), `forbidden` (403), `notFound` (404), `conflict` (409),
  `internal` (500), and — present in the code, available for future use
  even though nothing currently throws them — `gone` (410),
  `unprocessable` (422), `tooManyRequests` (429),
  `serviceUnavailable` (503). Service methods just `throw
  ApiError.forbidden('...')` etc.; they never format a response
  themselves.
- **`ApiResponse`** (`utils/ApiResponse.js`) — `ApiResponse.ok(res,
  data, message)` and `ApiResponse.created(res, data, message)` build
  and send the `{ code, message, data }` shape for the success path.
- **`errorHandler`** (`middleware/errorHandler.js`) — registered last in
  `app.js`. Catches anything thrown or passed to `next()`: an `ApiError`
  is used as-is; a raw Postgres error is translated by its error code
  (unique-violation → 409 Conflict, foreign-key-violation → 400 Bad
  Request, check-violation → 400 Bad Request) into a friendlier
  `ApiError` first; anything else becomes a generic 500, logged
  server-side but never leaking internal detail to the client. It then
  calls the *same* `ApiResponse` machinery the success path uses, so
  literally every response in the system — success or failure — is
  built by the same two functions.

`asyncHandler` (`utils/asyncHandler.js`) wraps every async router
handler so a rejected promise (a thrown `ApiError`, an unexpected
database error, anything) is forwarded to `next()` instead of becoming
an unhandled rejection — this is what makes "just throw" work uniformly
across every route without a `try/catch` in every handler.

### 6.5 Middleware pipeline

Global, in `app.js`, in order: `helmet()` → `cors()` (allow-listed
origin from `CORS_ORIGIN`) → `express.json()` → `morgan` request
logging → the ten modules' routers mounted under `/api/v1/*` → `notFound`
→ `errorHandler`.

Per-route, layered as needed:
- **`authenticate`** — reads `Authorization: Bearer <token>`, verifies
  it, sets `req.user = { id, role }`. The role name is embedded directly
  in the access token's own payload at login time, so this middleware
  never needs a database round-trip just to know who's asking.
- **`authorize(...roles)`** — a route-level allow-list check against
  `req.user.role`. This only ever answers "does this *account role*
  permit calling this endpoint at all" — it never checks "does this
  specific user own this specific document" or "is this user the
  assigned approver on this specific request." Those checks happen
  inside the relevant service method instead, right next to the query
  that needs the data to answer them.
- **`validate(schema)`** — runs the matching zod schema, replacing
  `req.body`/`params`/`query` with the parsed (defaulted/coerced)
  result so every downstream service method can trust its shape without
  re-checking it.

### 6.6 The shared phase-workflow utility

`utils/phaseWorkflow.js` exists because Editorial, Review, and
Publication share the exact same request-and-panel-of-approvers shape
and the exact same "raise a request" / "first-responder-wins" behavior.
Rather than re-implement that logic three times with three chances for
it to drift apart, each phase module's repository calls two shared
functions with its own table/column names:

- **`LATEST_PHASE_REQUEST_CTE`** — the literal SQL implementation of the
  Core Navigation Rule (§4): a `WITH` clause that unions all three
  request tables and, using `ROW_NUMBER() OVER (PARTITION BY
  document_id ORDER BY created_at DESC)` across the *combined* stream
  (not three separate per-table "latest" answers), finds the single
  true latest request row for each document, whichever table it's
  actually in.
- **`raisePhaseRequest(trx, {...})`** — inserts a new Pending request row
  plus one Pending approver row per assignee, always a fresh insert,
  never an update of a previous row.
- **`resolvePhaseApproverAction(trx, {...})`** — implements first-
  responder-wins: locks the request row (`FOR UPDATE`), checks it's
  still Pending, checks the acting user is actually one of the assigned
  approvers, records their decision, and updates the request's own
  status to match — all inside the transaction the caller supplies.
- **`logStageTransition(trx, {...})`** — appends one row to
  `document_stage_history`. Called from every service method that
  changes a document's stage or a request's status, so the Document
  Detail view's timeline is always complete without ever needing to be
  reverse-engineered from the request tables after the fact.

**`live_delete_requests` deliberately does *not* use this shared
helper.** Its unanimous-panel, single-reject-cancels-everything rule is
different enough (and safety-critical enough) that
`modules/deletion/deletion.repository.js` and
`deletion.service.js` implement their own logic directly rather than
forcing a mismatched abstraction to cover both cases.

---

## 7. Complete API reference

Base path for everything: `/api/v1`. Auth requirement legend:
**Public** = no token needed. **Any role** = valid access token, any
role including admin. **Content role** = valid access token, and
`req.user.role` must be one of author/editor/reviewer/publisher (admin
is rejected). **Admin** = `req.user.role` must be `admin`.

Every response is `{ code, message, data }` (see §6.4). Below,
"Returns" describes the shape of `data` on success.

### 7.1 Auth — `/auth`

| Method & path | Auth | Body | Returns | Purpose |
|---|---|---|---|---|
| `POST /register` | Public | `fullName, email, password` | `{ user, accessToken, refreshToken }` | Self-service signup. Always creates an **author** — there is no role field on this endpoint. Issues a token pair immediately; no admin activation step. |
| `POST /login` | Public | `email, password` | `{ user, accessToken, refreshToken }` | Authenticates, logs the attempt (success or failure) to `user_login_logs`, updates `last_login` on success. |
| `POST /refresh` | Public (needs a valid refresh token in the body) | `refreshToken` | `{ user, accessToken, refreshToken }` | Rotation: validates the old refresh token, issues a brand-new pair, revokes the old one and records the new token's hash as `replaced_by_hash` on it. |
| `POST /logout` | Public (needs the refresh token) | `refreshToken` | `null` | Revokes that one refresh token. Always "succeeds" from the caller's perspective even if the token was already invalid. |
| `POST /validate` | Public | `accessToken` | `{ valid: boolean, userId?, role? }` | Diagnostic check of whether an access token is currently valid, without throwing. Distinct from the `authenticate` middleware every protected route already runs. |
| `GET /profile` | Any role | — | The caller's own `{ userId, fullName, email, role }` | Derived from the verified token's own subject claim — never a client-supplied id. |
| `POST /forgot-password` | Public | `email` | `null` | **Always** responds with the same generic message whether or not the email is registered (never reveals which addresses exist). Emails (or console-logs, if SMTP is unset) a one-time reset link. |
| `POST /reset-password` | Public | `token, newPassword` | `null` | Consumes the one-time token, sets the new password, and revokes every other outstanding refresh token for that user (every other active session is logged out). |

### 7.2 Users — `/users` (lightweight, self-service directory)

| Method & path | Auth | Body/Query | Returns | Purpose |
|---|---|---|---|---|
| `GET /all?role=` | Any role | optional `role` query param | `[{ userId, fullName, email, role }]` | The lightweight directory every approver picker and every "Created By/Assigned By/Reviewer" column reads from. |
| `GET /:user_id` | Any role | — | One lightweight user record | Looking up another user's display info. |
| `PUT /me` | Any role | `fullName?`, `email?` (at least one) | Updated `{ userId, fullName, email }` | Self-service edit of the caller's own basic info. **Role is never accepted here** — the only way any role ever changes is `PUT /admin/role/:user_id`. |
| `PUT /me/password` | Any role | `currentPassword, newPassword` | `null` | Self-service password change. Requires the current password (proves control of the account even though the session is already authenticated). |

### 7.3 Admin — `/admin` (admin-only, every route)

| Method & path | Returns | Purpose |
|---|---|---|
| `GET /all` | `[{ userId, fullName, email, ssoId, lastLogin, isActive, createdAt, role }]` | Full account detail on every user. |
| `GET /roles` | `[{ role_id, role_name, role_level, description }]` | The 5 fixed roles. |
| `GET /:user_id` | Full detail on one user | — |
| `POST /users` | Body: `fullName, email, password, role, ssoId?` → created user | **Add User** — the one thing self-registration can't do: create an account with *any* role directly, editor/reviewer/publisher/admin included. |
| `PUT /:user_id` | Body: `fullName?, email?, ssoId?, isActive?` | Edits a user's basic info **and/or activation flag** — never role. |
| `PUT /role/:user_id` | Body: `role` | The **only** endpoint in the entire API that ever changes a user's role. |
| `DELETE /:user_id` | `null` | Soft-delete (deactivate) — the **only** way any user is ever removed. Also revokes every outstanding refresh token for that account. |

### 7.4 Documents — `/documents` (content role for writes; any role for the single GET, gated by document visibility)

| Method & path | Body | Returns | Purpose |
|---|---|---|---|
| `POST /new` | `category, title, content` | The created document | Doc Onboard. Composes `document_name = "V1 - {title}"`, pre-checks uniqueness, inserts inside a transaction (insert + self-referencing `root_document_id` update are two statements that must commit together). |
| `GET /all` | — | Every document the caller authored, any stage | Powers the Dashboard. |
| `PUT /:document_id` | `title?`, `content?` | Updated document | The **one** shared edit endpoint for the whole app. Who may call it and when is enforced centrally (§5.2) — author in Draft/Rejected/Cancelled at any phase, or an assigned editor while Editorial-Pending. If title changes, `document_name` is recomposed at the document's *current* `version_no` and re-checked for uniqueness. |
| `GET /:document_id` | — | Full document detail: metadata, content, `stage`, `latestPhase`/`latestStatus`, `author: {userId, fullName}`, and the full `stageHistory` timeline | **Document Detail.** Visibility rule: a Live, non-deleted document is public to anyone; anything else requires being the owner or someone who is/was an assigned approver on one of its requests. |
| `DELETE /:document_id` | — | `null` | Owner only, any status except Pending (§5.3). Live documents can never be deleted here — only via the Deletion module. |

### 7.5 Draft — `/draft` (content role)

| Method & path | Body | Returns | Purpose |
|---|---|---|---|
| `GET /all` | — | Documents with **no request ever raised** | "My Documents." |
| `GET /editors` | — | `[{ userId, fullName, email, role }]` filtered to editors | Picker list for the Promote modal. |
| `POST /promote/:document_id` | `editorIds: number[]` (1+) | The promoted document | Validates every id is a real, active, editor-role user; raises the first `editorial_requests` row; advances `documents.stage` to `EDITORIAL`. |

### 7.6 Editorial — `/editorial` (content role)

| Method & path | Body | Returns | Purpose |
|---|---|---|---|
| `GET /my-requests` | — | Documents I authored currently at Editorial (any status) | |
| `GET /for-approval` | — | Editorial requests assigned to *me*, resolved or not | |
| `GET /reviewers` | — | Reviewer-role users | Picker for promoting forward. |
| `POST /promote/:document_id` | `reviewerIds: number[]` | Updated document | **Forward move**, only valid when the latest editorial request is Approved. Raises `review_requests`, stage → `REVIEW`. |
| `POST /repromote/:document_id` | `editorIds: number[]` | Updated document | **Re-raise at the same phase**, only valid after Rejected/Cancelled. New `editorial_requests` row, stage advances DRAFT → `EDITORIAL` again. |
| `POST /cancel/:document_id` | — | Updated document | Author cancels their own Pending request. Stage reverts to `DRAFT`. |
| `POST /action/:document_id` | `action: 'APPROVED'\|'REJECTED', comments?` | Updated document | An assigned editor's decision. Approve: stage stays `EDITORIAL`. Reject: stage reverts to `DRAFT`. (An editor may also call `PUT /documents/:id` beforehand/independently to edit content — that's a separate call, not part of this one.) |

### 7.7 Review — `/review` (content role)

Identical shape to Editorial, one phase along — reviewer never gets an
edit action (§5.2).

| Method & path | Body | Purpose |
|---|---|---|
| `GET /my-requests`, `GET /for-approval` | — | Same shape as Editorial. |
| `GET /publishers` | — | Picker for promoting forward. |
| `POST /promote/:document_id` | `publisherIds: number[]` | Forward, once Approved. Raises `publication_requests`, stage → `PUBLICATION`. |
| `POST /repromote/:document_id` | `reviewerIds: number[]` | Re-raise after Rejected/Cancelled, stage EDITORIAL → `REVIEW` again. |
| `POST /cancel/:document_id` | — | Reverts to `EDITORIAL`. |
| `POST /action/:document_id` | `action, comments?` | Approve keeps stage at `REVIEW`; Reject reverts to `EDITORIAL`. |

### 7.8 Publication — `/publication` (content role) — the special one

| Method & path | Body | Purpose |
|---|---|---|
| `GET /my-requests`, `GET /for-approval`, `GET /publishers` | — | Same shape as above. |
| `POST /repromote/:document_id` | `publisherIds: number[]` | Re-raise **after Rejected (unpublished) only** — there is no plain `promote` in this module at all, since Review's own `promote` is what gets a document *into* Publication in the first place. |
| `POST /cancel/:document_id` | — | Author cancels their own Pending request. Reverts to `REVIEW` (this is the one Cancel in the whole system that *does* fully revert, unlike a publisher's own Reject). |
| `POST /action/:document_id` | `action: 'APPROVED'\|'REJECTED', comments?` | **The terminal decision, with no further step after it.** `APPROVED` = publish: stage → `LIVE`, `is_locked` → `true`, a `document_live` row is created (flipping any previous current version's row to `is_current = false` first, in the same transaction). `REJECTED` = unpublish: stage **stays** `PUBLICATION` (§3.5) — the frontend labels these buttons "Publish"/"Unpublish," not "Approve"/"Reject," even though those are the literal values sent. |

### 7.9 Live — `/live`

| Method & path | Auth | Body | Returns | Purpose |
|---|---|---|---|---|
| `GET /feed` | **Any role** (including admin) | — | Every current, non-deleted live document, from every author | **Home** — the public feed. |
| `GET /all` | Content role | — | Only the caller's own current live documents | **Live** (personal). |
| `POST /upgrade/:document_id` | Content role | `title, content` | The newly created v(n+1) document, `stage = DRAFT` | Clones a new version. Category is carried over from the live document and is **not** accepted in this body at all (it's fixed). Blocked (409 Conflict) if another version of the family is already in flight, or if a deletion request is Pending on this document. |

### 7.10 Deletion — `/deletion` (content role)

| Method & path | Body | Returns | Purpose |
|---|---|---|---|
| `GET /my-requests` | — | Deletion requests I raised, with the full 3-person approver panel and each of their individual vote statuses | |
| `GET /for-approval` | — | Deletion requests where I'm one of the 3 assigned approvers | |
| `POST /request/:document_id` | `reason, editorId, reviewerId, publisherId` | The created request | Author requests deletion of their own live document. Validates each id actually holds the matching role. Blocked if a request is already Pending on this document, or an upgrade is in flight for the family. |
| `POST /cancel/:delete_request_id` | — | `null` | Author cancels their own still-Pending request. |
| `POST /action/:delete_request_id` | `action: 'APPROVED'\|'REJECTED', comments?` | `{ deleteRequestId, status, documentDeleted: boolean }` | One of the three assigned approvers votes. A single `REJECTED` cancels the whole request immediately. On the **third** `APPROVED`, cascades a soft-delete across the *entire* document family in the same transaction — `documentDeleted` is `true` only on that resolving call, `false` on the 1st/2nd approve or on a reject. |

---

## 8. Database

Three formats of the exact same schema, kept in one `database/` folder
specifically so they can never drift out of sync with each other.

### 8.1 Table-by-table purpose

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | Every account. | `sso_id` (unique, nullable — reserved for future SSO, unused today), `is_active`, `is_deleted` (soft-delete flag), `created_by` (self-referencing FK — nullable for self-registration/the bootstrap admin). |
| `user_passwords` | One row per user, overwritten in place on every password change (not appended to). | `hash_password` (bcrypt). |
| `roles` | The 5 fixed roles. | `role_level` (informational ordering, not enforced anywhere). |
| `user_roles` | One active role per user — `UNIQUE(user_id)`, so changing a role is an `UPDATE` of the existing row, not an insert. Trades away a full change-history for simplicity. | |
| `documents` | The core table. One row **per version**, not per logical document. | `document_name` (the unique `"V{n} - {title}"` composite, see §5.4), `version_no`, `stage` (structural, see §4), `parent_document_id`/`root_document_id` (version-family links), `is_locked` (true forever once Live), `is_deleted`. |
| `document_stage_history` | Append-only audit trail. One row per transition, written by `logStageTransition`. | `from_stage`/`to_stage`, `old_status`/`new_status`, `action_by`. |
| `document_live` | One row per version that was **ever** published (not one row per document). | `is_current` (exactly one `true` row per `root_document_id`, enforced at the DB level — see 8.3), `published_by`, `is_deleted`. |
| `editorial_requests` + `editorial_request_approvers` | One row per promotion **attempt** (never updated in place — see §4) + one row per assigned editor per attempt. | `status` on the request; `approver_action` per approver row. |
| `review_requests` + `review_request_approvers` | Same shape, one phase along. | |
| `publication_requests` + `publication_request_approvers` | Same shape; `status = REJECTED` here specifically means "unpublished." | |
| `live_delete_requests` + `live_delete_request_approvers` | The 3-person unanimous panel. `approver_role` (`EDITOR`/`REVIEWER`/`PUBLISHER`) plus a `UNIQUE(delete_request_id, approver_role)` constraint guarantee exactly one of each role per request at the database level, not just in application code. | `reason` (required, non-empty, enforced by a `CHECK` constraint). |
| `user_login_logs` | Every login attempt, success or failure. | `login_status`, `failure_reason`, `ip_address`. |
| `refresh_tokens` | Opaque refresh tokens, hashed. | `token_hash` (unique), `revoked_at`, `replaced_by_hash` (rotation trail). |
| `password_reset_tokens` | Opaque, one-time password reset tokens, hashed. | `used_at` (one-time-use gate), `expires_at`. |

### 8.2 The three formats

1. **`database/knex/migrations/`** — 16 files, run in strict numeric
   order, plus `database/knex/seeds/001_roles_and_admin.js`. This is
   what the backend actually runs (`npm run migrate`, `npm run seed`
   from `backend/`). **Postgres-only** — this is the app's real target.
2. **`database/postgres/schema.sql`** — the exact same schema
   consolidated into one plain SQL file, for standing up a database
   without knex at all (`psql -f database/postgres/schema.sql`).
3. **`database/mysql/schema.sql`** — a **faithful, not byte-for-byte**
   MySQL 8.0+ equivalent, for teams that must run on MySQL instead. Three
   Postgres-only features have no MySQL equivalent and are each worked
   around, documented inline in the file itself:
   - Named `CREATE TYPE ... AS ENUM` → inline `ENUM(...)` repeated per
     column (MySQL has no shared, reusable named enum type).
   - `GENERATED BY DEFAULT AS IDENTITY` → `AUTO_INCREMENT`.
   - The partial unique index enforcing "at most one current version per
     document family" (`CREATE UNIQUE INDEX ... WHERE is_current =
     true`) has no MySQL equivalent at all. Worked around with a
     `STORED` generated column, `current_root_document_id`, defined as
     `IF(is_current = TRUE, root_document_id, NULL)`, carrying a plain
     `UNIQUE` constraint — both Postgres and MySQL allow unlimited
     `NULL`s through a unique index, so non-current rows (where the
     generated column is `NULL`) never collide with each other; only two
     simultaneously-*current* rows for the same family would, and that's
     exactly what needs to be prevented.
   - `token_hash` columns are `VARCHAR(255)` instead of `TEXT`, since
     MySQL cannot place a `UNIQUE` index directly on a bare `TEXT`
     column.

Only run **one** of "migrations via knex" or "the plain SQL file"
against any given database — never both.

### 8.3 Seed data

Every one of the three formats seeds the identical bootstrap state: the
5 roles (explicit `role_id` 1–5, matching the fixed mapping used
throughout the app — not left to auto-increment), one admin account,
and 4 additional demo accounts, one per remaining role, so the whole
review pipeline (author → editor → reviewer → publisher) has a real
account to sign in as without the admin having to register each one by
hand first. All 5 share the same placeholder password:

| Full name | Email | Role | Password |
| --- | --- | --- | --- |
| Aditi Singh | `aditi.singh@docflow.admin` | admin | `password` |
| Aman Bisht | `aman.bisht@docflow.author` | author | `password` |
| Esha Singh | `esha.singh@docflow.editor` | editor | `password` |
| Rita Kumari | `rita.kumari@docflow.reviewer` | reviewer | `password` |
| Piyush Bhatt | `piyush.bhatt@docflow.publisher` | publisher | `password` |

Each account has its own independently-salted bcrypt hash of the same
placeholder password — that password is a bcrypt hash that's the same,
precomputed literal value baked into all three seed paths for a given
account — deliberately *not* hashed at seed-time by a script, because the
knex seed file lives under `database/knex/seeds/`, outside `backend/`'s
own `node_modules`, and can't import `bcryptjs` to hash it on the fly
(this was discovered by actually running `knex seed:run` against a live
database while building the project — the seed originally tried to
`import bcrypt from 'bcryptjs'` and failed to resolve it). **Change these
passwords immediately after first login in any real environment** —
they're published here and in the source precisely because they're
meant to be temporary and universally known as bootstrap/demo values,
not secrets.

The admin (Aditi Singh, `user_id` 1) is the one seeded with
`created_by: null`, for the same chicken-and-egg reason described in
`database/knex/seeds/001_roles_and_admin.js` — the 5 roles reference her
as their creator, and the other 4 demo users are then recorded as
"created by" her, matching what would happen if she'd registered them
through the app herself.

---

## 9. Frontend architecture

### 9.1 Tech stack

- **React 19**, built with **Vite**.
- **React Router 7** (`createBrowserRouter`/`createRoutesFromElements` —
  the "data router" API, needed specifically because the layout reads
  each route's own `handle` via `useMatches()`, which plain
  `<BrowserRouter>`/`<Routes>` doesn't support).
- **Tailwind CSS v4**, configured the new CSS-first way (`@import
  "tailwindcss"` plus an `@theme` block directly in `styles/global.css`
  — there is no separate `tailwind.config.js` file at all).
- **`lucide-react`** for every icon in the app.
- Plain **`fetch`** for API calls (`src/api/client.js`) — no axios, no
  React Query/SWR. State lives in React's own `useState`/Context; there
  is no separate global state library, because nothing in this app's
  actual data needs (a handful of list pages, a handful of modals) calls
  for one.
- No new runtime dependency was introduced anywhere in this project's
  second pass (dark mode, the collapsible sidebar, the filter/sort
  system, and the reading page were all built with what was already
  there).

### 9.2 Folder structure (current, accurate)

```
frontend/
├── index.html                 Loads Fraunces/Inter/JetBrains Mono from Google Fonts.
├── vite.config.js              React + Tailwind v4 plugins; dev proxy: /api/* -> localhost:4000.
├── src/
│   ├── main.jsx                 ReactDOM root, imports styles/global.css.
│   ├── App.jsx                  Provider nesting: Theme > Auth > Toast > Sidebar > Router.
│   ├── router.jsx                The entire route table - see §9.3.
│   ├── api/                      One file per backend module, plus:
│   │   └── client.js              The fetch wrapper - see §9.5.
│   ├── context/
│   │   ├── AuthContext.jsx        Session state (user, tokens via localStorage), login/register/logout.
│   │   ├── ToastContext.jsx       Success/error toast notifications.
│   │   ├── ThemeContext.jsx       Light/dark mode - see §12.
│   │   ├── SidebarContext.jsx     Collapsed/expanded sidebar state, persisted.
│   │   └── PageMetaContext.jsx    Lets any page publish a live row-count the Header displays.
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx        The authenticated shell: Header + Sidebar + page icon/title/count + Outlet + Footer.
│   │   │   ├── Header.jsx           Full-width top bar: sidebar-collapse toggle, logo, theme toggle, profile menu.
│   │   │   ├── Sidebar.jsx          The collapsible left nav - role-conditional item list.
│   │   │   ├── Footer.jsx           Small persistent footer, used in both the app shell and auth pages.
│   │   │   ├── PageHeader.jsx       NOT CURRENTLY USED anywhere - see §13.
│   │   │   ├── RequireAuth.jsx      Route guard: redirect to /login if not authenticated.
│   │   │   └── RequireRole.jsx      Route guard: redirect to each role's own landing page if not permitted.
│   │   ├── ui/                     Generic, domain-unaware building blocks - see §11.4.
│   │   ├── documents/               Domain components - see §11.3.
│   │   └── editor/                  The embedded rich text editor - see §10.
│   ├── pages/                       One file per route - see §11.1/§11.2.
│   │   ├── auth/                    Login, Register, ForgotPassword, ResetPassword.
│   │   └── admin/                   Users.
│   ├── lib/
│   │   ├── roles.js                 ROLES, CONTENT_ROLES, ROLE_LABELS.
│   │   ├── status.js                Status/stage label + color-token lookups.
│   │   ├── date.js                  formatDate/formatDateTime.
│   │   ├── constants.js             RE_PROMOTABLE (mirrors the backend's RE_PROMOTABLE_STATUSES).
│   │   ├── navigation.js            The single source of truth for sidebar items AND route titles/icons - see §9.3.
│   │   ├── filters.js               matchesFilters() - see §9.6.
│   │   └── sort.js                  sortRows() + per-page-family SORT_OPTIONS - see §9.6.
│   └── styles/
│       └── global.css               Tailwind import + the full design-token theme (light & dark) - see §12.
```

### 9.3 Routing table

Defined once, in `router.jsx`, and it is the literal source every guard
and every page title comes from. `lib/navigation.js` supplies the
`icon`/`label` for both the Sidebar's own list *and* each route's
`handle` (so the icon shown in the sidebar and the icon shown next to
the page's own heading in `AppLayout` can never disagree with each
other, because they're read from the same array).

| Path | Layout | Guard | Page | Notes |
|---|---|---|---|---|
| `/` | — | — | `Landing` | Public marketing/welcome page. If already authenticated, immediately redirects to `/home`. |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | `AuthShell` (inline per-page) | — | `Login`, `Register`, `ForgotPassword`, `ResetPassword` | |
| `/read/:documentId` | — (no sidebar/header at all) | `RequireAuth` | `DocumentReader` | Full-page, distraction-free reading view — see §11.2. |
| `/home` | `AppLayout` | `RequireAuth` | `Home` | Every role, admin included. |
| `/profile` | `AppLayout` | `RequireAuth` | `Profile` | Every role. |
| `/dashboard`, `/doc-onboard`, `/draft`, `/editorial`, `/review`, `/publication`, `/live`, `/deletion` | `AppLayout` | `RequireAuth` → `RequireRole(CONTENT_ROLES)` | `Dashboard`, `DocOnboard`, `Draft`, `Editorial`, `Review`, `Publication`, `Live`, `Deletion` | Admin is redirected away from all of these (to `/users`). |
| `/users` | `AppLayout` | `RequireAuth` → `RequireRole(['admin'])` | `Users` (admin) | Every content role is redirected away from this (to `/home`). |
| `*` | — | — | `NotFound` | |

`RequireRole` redirects rather than showing a bare "forbidden" page —
each role lands somewhere that actually has content for it (content
roles → `/home`, admin → `/users`).

### 9.4 State management (contexts)

- **`AuthContext`** — holds `{ user, isAuthenticated, loading }` plus
  `login/register/logout` functions. The session (user + both tokens)
  is persisted as one JSON blob in `localStorage`. Listens for a
  `docflow:session-expired` window event (dispatched by `api/client.js`
  when a silent token refresh fails) so every open tab reacts to a truly
  expired/revoked session, not just the tab that happened to make the
  failing request.
- **`ToastContext`** — a `push(message, tone)` function any component
  can call; renders a small stack of auto-dismissing notifications.
- **`ThemeContext`** — `{ theme: 'light'|'dark', toggle() }`. Persists
  to `localStorage`, applies/removes a `.dark` class on `<html>` (which
  is what every dark-mode CSS override in `global.css` keys off — see
  §12), and defaults to the OS-level `prefers-color-scheme` on first
  visit if nothing is saved yet.
- **`SidebarContext`** — `{ collapsed: boolean, toggle() }`, persisted to
  `localStorage`. Drives both the Sidebar's own width (60 → 20 in
  Tailwind spacing units) and `AppLayout`'s content-area left padding,
  which must stay in sync with it.
- **`PageMetaContext`** — a narrow, single-purpose piece of state: any
  page can call the `usePageCount(n)` hook to publish "how many rows are
  currently showing after search/filter," and `AppLayout`'s header
  region displays that number next to the page's title as a small badge.
  Exists purely so a filtered list page (e.g. Draft with a search query
  active) can show "Draft · 3" instead of the header just repeating the
  page name with no useful information.

### 9.5 The API client (`src/api/client.js`)

A single `apiRequest(path, { method, body, auth })` function every
`api/*.api.js` module is built on top of:

- Reads the current session from `localStorage`, attaches
  `Authorization: Bearer <accessToken>` unless the call explicitly opts
  out (`auth: false` — used by login/register/forgot-password, which by
  definition don't have a token yet).
- **Success/failure is read from `fetch`'s own `response.ok`** (true for
  any 2xx HTTP status) — not from any field inside the JSON body. This
  is what lets the client stay correct across the backend's `{ code,
  message, data }` envelope (§6.4) without needing to special-case
  reading `code` out of the body at all.
- **Automatic, de-duplicated silent refresh on a 401.** If a call gets a
  401 and this wasn't already a retry, it calls `/auth/refresh` once and
  retries the original request exactly one time. If *several* requests
  401 at the same moment, they all await the *same* in-flight refresh
  call (`refreshPromise` is a module-level singleton) rather than each
  firing their own — so a page that fires four parallel requests when it
  loads only ever triggers one refresh, not four.
- If the refresh itself fails, the session is cleared and a
  `docflow:session-expired` event is dispatched for `AuthContext` to react
  to (see §9.4).
- On any non-2xx response, throws an `Error` whose `.message` is the
  backend's own `message` string and whose `.details` is the backend's
  `data` (structured validation errors, etc.) — every page's `catch`
  block just shows `err.message` in a toast.

### 9.6 The filter/sort infrastructure

Introduced to replace what was originally ad-hoc inline `.filter()`
calls duplicated across every list page, now centralized in two small,
page-agnostic library files plus one shared component:

- **`lib/filters.js`** — `matchesFilters(row, filters, { statusField })`
  checks a row against a `{ status, sort }`-shaped filter object (`status
  = 'ALL'` matches everything). `DEFAULT_FILTERS` (`{ status: 'ALL', sort:
  ... }`) is exported from `FilterPanel.jsx` itself so every page shares
  the exact same starting state.
- **`lib/sort.js`** — `sortRows(rows, sortKey)` applies one of several
  named comparators (newest/oldest first, title A→Z/Z→A, etc.). Not
  every page offers every sort option — `SORT_OPTIONS` is keyed by a
  small "family" string (e.g. request-style pages vs. the Home/Live
  feed) so each page's `FilterPanel` only offers sort choices that
  actually make sense for the data it shows.
- **`components/ui/FilterPanel.jsx`** — one dropdown panel combining the status filter and the
  sort choice into a single control, replacing what was originally two
  separate `StatusFilter` + implicit-sort UI elements. (Its own code
  comments record that an earlier version of this same panel included a
  Published-date **range** picker — two `<input type="date">` fields —
  which is what was actually overflowing the panel's fixed width; that
  was replaced with the current dropdown-based sort list rather than
  fixing the date inputs' sizing, because the sort-list approach covers
  the same "find things from around a certain time" need without the
  layout problem.)

Every list page (`Draft`, `Editorial`, `Review`, `Publication`, `Live`,
`Deletion`, `Dashboard`, admin `Users`) wires these together the same
way: `useState` for the raw rows, a `query` string for free-text search
(still a separate `SearchBar`, not folded into `FilterPanel`), a
`filters` object for `FilterPanel`, then `sortRows(rows.filter(...).
filter((r) => matchesFilters(...)), filters.sort)` computed inline on
every render, finally reported to the header via `usePageCount`. `Home`
also uses `FilterPanel` (for the public feed's own sort options) but,
notably, does **not** call `usePageCount` — see §13.

---

## 10. The embedded editor, in full

### 10.1 What it is

`components/editor/` is a complete, from-scratch, `contentEditable`-based
rich text editor — a "Jodit clone," per its own `package.json` name from
before it was folded into this project. It has **no third-party editor
library dependency at all** (not Slate, not ProseMirror, not Draft.js,
not TipTap) — the only runtime dependency it brings is `highlight.js`,
used solely for syntax-highlighting inside code blocks. Every plugin
(bold, italic, lists, tables, images, links, alerts, code blocks, emoji,
find/replace, fullscreen, source view, print/export, and more) is
original code written against the browser's native `contentEditable`
and Selection APIs.

It was supplied as a separate, pre-built project and integrated
**wholesale** — copied into `components/editor/` essentially unmodified,
with the two specific, deliberate exceptions described in §10.4.

### 10.2 Why it fits this app's needs exactly

Because it's `contentEditable`-based, its native data representation
*is* HTML — there was never a serialization format to design or a
converter to write. The editor already does exactly what "convert
content to HTML and save it to the database" requires, out of the box:

- **`initialValue`** (a prop) — an HTML string to load in.
- **`onChange`** (a prop, a callback) — fires with the current,
  sanitized HTML string on every edit, undo, and redo.

Every place in this app that needs to save document content just holds
that HTML string in ordinary React state and sends it to the backend as
plain text in a JSON body (`documents.content`, a `TEXT` column) — no
transformation in either direction.

**Content safety is handled by the editor itself, not by this app.**
Every boundary where content enters the editor from outside (loading
`initialValue`, calling `setHTML`, pasting) runs through the editor's
own `sanitizeHtml()`: script tags, `on*` event-handler attributes, and
`javascript:`/`vbscript:` URIs are stripped, and `<iframe>` embeds are
restricted to YouTube/Vimeo. Because of this, HTML that was ever saved
*through* the editor is already safe to render elsewhere without a
second sanitization pass — which is exactly why the read-only rendering
paths (§10.4, §11.3) are also allowed to trust it.

### 10.3 File layout inside `components/editor/`

```
components/editor/
├── index.js              Barrel file (new - see below): re-exports Editor, allPlugins, toolbarRows.
├── components/           Editor.jsx (the outer shell), Toolbar/ToolbarButton/ToolbarButtonGroup/
│                         ToolbarDropdown, Modal, ColorPicker, Icon, PopupTrigger, SourceView,
│                         StatusBar, TableTools, TableColorPopup, and per-feature popup forms
│                         (popups/ subfolder - link/image/table/video/etc. insert dialogs).
├── core/                 EditorContext.jsx (the central state/command engine - see §10.4),
│                         CommandRegistry, SelectionManager, domUtils, sanitize.js, clipboardUtils,
│                         codeBlockDom, icons.js (the editor's own self-contained SVG icon set -
│                         not lucide-react, deliberately: this is a separate concern from the
│                         rest of the app's iconography).
├── plugins/               One file per toolbar feature - bold, italic, underline, strike,
│                          superscript/subscript, font family/size, text/background color,
│                          clear-formatting, lists, indent, align, format-block (headings/
│                          paragraph), line-height, alerts (note/tip/important/caution/warning),
│                          link/image/file/video/table/code insertion, horizontal line, special
│                          characters, emoji picker, cut/copy/paste/select-all, find/replace,
│                          fullscreen, lock (read-only toggle - see §10.4), theme (the editor's
│                          OWN light/dark toggle, distinct from and normally overridden by the
│                          app's ThemeContext via `syncTheme` - see §10.4), preview, print/export,
│                          about, sourceMode (view/edit raw HTML directly), index.js (exports
│                          `allPlugins` and the two-row `toolbarRows` layout).
└── styles/editor.css      All of the editor's own CSS, including the `.jc-content` typography
                           rules that `styles/global.css`'s `.docflow-content`/`.prose-reader`
                           classes are deliberately written to visually match.
```

The only file in this whole folder that did **not** exist in the
originally-supplied editor project is `index.js`, added purely as a
clean single import path (`import { Editor, allPlugins, toolbarRows }
from '../editor'`) for the rest of this app to use.

### 10.4 The two deliberate modifications

Two files — and only two — were changed from the originally-supplied
editor project, to add exactly the capability this app's read-only
document-reading surfaces needed. Everything else in `components/editor/`
(all plugins, all popups, all of `core/`, all of the CSS) is exactly as
supplied.

1. **`components/Editor.jsx`** and **`core/EditorContext.jsx`** gained
   support for two new, optional props:
   - **`readOnly`** — reuses a mechanism the editor *already had*: its
     existing `lock` plugin, which lets a user toggle the whole document
     into a non-editable state from the toolbar. Passing `readOnly`
     simply pre-initializes that same internal "locked" state to `true`
     on mount, **and** tells `Editor.jsx`'s outer shell to render with no
     toolbar chrome at all — a completely clean surface showing only the
     content, rather than a visible-but-disabled toolbar. This is not a
     parallel read-only implementation; it's the smallest possible
     addition on top of a feature the editor was already built with.
   - **`syncTheme`** — lets a *host* component (see below) drive the
     editor's internal light/dark appearance directly, instead of the
     editor managing its own independent theme preference (which it
     also has, as its own plugin, normally persisted to its own
     `localStorage` key). Without this, it would be possible for the
     app to be in dark mode while an embedded read-only editor instance
     still rendered in light mode, or vice versa — visually jarring and
     confusing. `syncTheme` avoids that by construction.

2. **`components/documents/DocumentContentViewer.jsx`** (a new file, in
   `components/documents/`, not inside `components/editor/` itself) is
   the thin wrapper that actually uses these two new props: it mounts the
   real `<Editor>` component with `toolbarRows={[]}`, `readOnly`, and
   `syncTheme={theme}` (read from `ThemeContext`). This is what every
   read-only content display in the app now uses — `DocumentDetailModal`
   and `DocumentReader` — in place of what an earlier version of this
   app did, which was simply dumping the raw saved HTML into a `<div>`
   via `dangerouslySetInnerHTML`. Rendering through the real editor
   engine instead of raw `dangerouslySetInnerHTML` means things like
   syntax-highlighted code blocks, alert callouts, and tables render
   with full fidelity — pixel-identical to how they looked while being
   written — rather than however the browser's default styling happens
   to interpret the bare HTML tags.

### 10.5 How the rest of the app actually talks to the editor

- **`components/documents/DocumentEditorField.jsx`** — the *writable*
  wrapper. Used by every form that creates or edits a document
  (`DocumentForm.jsx`, which itself backs Doc Onboard, the Edit modal,
  and the Upgrade modal). Renders the full `<Editor>` with its full
  toolbar, wires `initialValue`/`onChange` straight to a piece of parent
  React state holding the current HTML string, and imports
  `styles/editor.css` directly so the toolbar and editing surface are
  fully styled wherever this field appears.
- **`components/documents/DocumentContentViewer.jsx`** — the *read-only*
  wrapper, described above.

Nothing else in the app ever imports from `components/editor/` directly;
these two wrapper components are the entire integration surface.

---

## 11. Every frontend page and component, and its purpose

### 11.1 Public / auth pages (`pages/`, `pages/auth/`)

| File | Route | Purpose |
|---|---|---|
| `Landing.jsx` | `/` | Marketing/welcome page for a signed-out visitor: headline, feature highlights, links into Login/Register. Redirects straight to `/home` if the visitor already has a session. |
| `auth/Login.jsx` | `/login` | Email/password sign-in. Exports the shared `AuthShell` (the split-screen brand panel + form card layout every auth page uses) and `Field` (a labeled input with an automatic show/hide toggle for password fields) for the other three auth pages to reuse. |
| `auth/Register.jsx` | `/register` | Full name/email/password sign-up. Always creates an author account — there is no role choice on this screen. |
| `auth/ForgotPassword.jsx` | `/forgot-password` | Collects an email, calls the forgot-password endpoint, shows the same "check your email" confirmation regardless of whether that address is actually registered. |
| `auth/ResetPassword.jsx` | `/reset-password?token=...` | Reads the token from the URL query string, collects and confirms a new password. |

### 11.2 Authenticated pages (`pages/`, `pages/admin/`)

| File | Route | Purpose |
|---|---|---|
| `Home.jsx` | `/home` | The public feed — every current live document, from every author, rendered as a card grid (not a management table — this is the one page in the app styled closer to a magazine/editorial layout than a dense data view). Clicking a card navigates to `/read/:id`, not a modal. |
| `Dashboard.jsx` | `/dashboard` | Every document the caller authored, at *any* stage, in one table. Purely informational — View only; no promote/edit/delete actions live here, since those belong to the specific phase pages. |
| `DocOnboard.jsx` | `/doc-onboard` | The document-creation form (`DocumentForm.jsx` with category editable). On success, redirects to `/draft`. |
| `Draft.jsx` | `/draft` | "My Documents" — the single, untabbed list of never-promoted documents. Actions: View, Edit, Promote (opens the editor picker), Delete. |
| `Editorial.jsx` | `/editorial` | Two tabs (My Requests / Requests For Approval). See §3.3 and §7.6 for the exact action set per status/tab. |
| `Review.jsx` | `/review` | Same two-tab shape, one phase along; no Edit action on the approval side (§5.2). |
| `Publication.jsx` | `/publication` | Same two-tab shape; the approval-side action is labeled **Publish**/**Unpublish**, not Approve/Reject, even though those are the literal values sent to the API; "My Requests" only ever shows Pending or Rejected rows (an Approved request immediately becomes Live and leaves this list entirely). |
| `Live.jsx` | `/live` | The caller's own current live documents. Actions: View, **Upgrade**, **Request deletion**. |
| `Deletion.jsx` | `/deletion` | Two tabs for the 3-person unanimous panel. "My Requests" shows the full approver panel and each person's individual vote (`ApproverProgress`, a small inline component defined at the top of this file); "For Approval" shows a Vote action only while the request is Pending *and* the caller's own vote is still Pending. |
| `Profile.jsx` | `/profile` | Self-service: edit own name/email (`PUT /users/me`), change own password (`PUT /users/me/password`). Displays the account's role as read-only text ("only an admin can change this"). |
| `admin/Users.jsx` | `/users` | Full user management: list (with an SSO ID column), Add User (with a role dropdown — the one place any role including admin can be assigned directly), Edit (basic info + role + the `isActive` `Switch` toggle), Delete (deactivate). |
| `DocumentReader.jsx` | `/read/:documentId` | A full-page, distraction-free reading view with **no sidebar or header at all** — just the document's title, category, author byline, and its content rendered through `DocumentContentViewer` at a larger, article-scale typographic size (`.prose-reader` — see §12). Reachable from Home's cards and, in at least one place, directly linked to as "read the full document." |
| `NotFound.jsx` | `*` | Plain 404 with a link back to Home. |

### 11.3 Document-domain components (`components/documents/`)

| File | Purpose |
|---|---|
| `DocumentForm.jsx` | The shared create/edit form: Category (editable only at creation — locked thereafter), Title, and a `DocumentEditorField`. Used directly by `DocOnboard`, and wrapped by `EditDocumentModal`/`UpgradeModal` for their respective contexts. |
| `DocumentEditorField.jsx` | The writable editor wrapper — see §10.5. |
| `DocumentContentViewer.jsx` | The read-only editor wrapper — see §10.4/§10.5. |
| `DocumentDetailModal.jsx` | The shared "View" surface used from every list page in the app. Always calls `GET /documents/:id` and trusts the backend's own visibility rule rather than the frontend guessing who can see what. Shows category/version/status, the `StageTracker`, the rendered content (via `DocumentContentViewer`), the author byline, and the full stage-history timeline. |
| `EditDocumentModal.jsx` | Wraps `DocumentForm` (category locked) for the Edit row-action everywhere it appears. |
| `UpgradeModal.jsx` | Wraps `DocumentForm` (category locked, pre-filled from the live document) for Live's Upgrade action. On success, navigates to `/draft` so the new version is immediately visible. |
| `PromoteModal.jsx` | The reusable "assign one or more approvers" modal — used by Draft's Promote, and Editorial/Review's Promote *and* Repromote. Takes a `fetchOptions` function (which picker endpoint to call) and an `onSubmit`, so the same component drives every one of these without being copy-pasted per phase. `defaultSelected` pre-fills a Repromote's previous assignees as an editable starting point. |
| `ApproverActionModal.jsx` | The reusable Approve/Reject decision modal, with an optional comment field. Used by Editorial/Review's decision action, Publication's decision action (with `approveLabel="Publish"`/`rejectLabel="Unpublish"` overrides), and Deletion's per-person vote (same component, generic labels). |
| `DeletionRequestModal.jsx` | The special deletion-request form: a required reason plus three separate single-select pickers (editor/reviewer/publisher — exactly one of each, not multi-select like every other approver picker in the app). |
| `StageTracker.jsx` | The signature docflow-track visual (§12) — a document's position in the Draft→Editorial→Review→Publication→Live pipeline rendered as a literal connected track, used inside `DocumentDetailModal`. |

### 11.4 Generic UI components (`components/ui/`)

| File | Purpose |
|---|---|
| `Button.jsx` | Base button — `variant` (primary/secondary/danger/ghost) × `size` (sm/md), optional leading icon. |
| `IconButton.jsx` | A small icon-only button for table row actions (View/Edit/Promote/Delete/etc.), with `variant` (default/accent/danger) controlling its hover color. |
| `Badge.jsx` | Exports `StatusBadge` (Pending/Approved/Rejected/Cancelled/None) and `StageBadge` (Draft/Editorial/Review/Publication/Live, with Live getting a small "pulse dot" treatment) — see §11 note on why these never need dark-mode-specific classes. |
| `Modal.jsx` | The base modal shell every other modal in the app is built on: overlay, centered card, header with title/description/close button, `Escape`-to-close. |
| `ConfirmDialog.jsx` | A thin wrapper around `Modal` for a plain confirm/cancel action (used for every Delete/Cancel confirmation in the app). |
| `DataTable.jsx` | The generic table every list page renders through: takes `columns` (each with an optional custom `render`), `rows`, a `rowKey` function, and an optional `actions` render-prop for the trailing actions cell. Knows nothing about documents/requests/users itself. |
| `Tabs.jsx` | The My Requests / Requests For Approval tab control, with an optional count badge per tab. |
| `SearchBar.jsx` | A single free-text search input, debounced only by React's own render cycle (no explicit debounce timer — filtering is a cheap in-memory `.filter()` over an already-small list). |
| `FilterPanel.jsx` | The status + sort dropdown panel — see §9.6 for its full role and history. Exports `DEFAULT_FILTERS` as the shared starting state every page imports. |
| `MultiSelect.jsx` | A searchable checkbox (or radio, via `multiple={false}`) list — every approver picker in the app (`PromoteModal`'s multi-select, `DeletionRequestModal`'s three single-selects) is built on this one component. |
| `Switch.jsx` | A binary on/off toggle — currently used for the `isActive` field in admin's Edit User form. |
| `EmptyState.jsx` | The "nothing here yet" placeholder (icon + title + description + optional action button) shown wherever a list is empty. |
| `PageHeader.jsx` | **Not used anywhere in the current app** — see §13. |

---

## 12. Design system (colors, typography, dark mode)

Everything is defined once, as CSS custom properties, in
`styles/global.css`'s `@theme` block (Tailwind v4's CSS-first
configuration — there is no separate `tailwind.config.js`). This is a
two-layer system:

1. **Primitives** — raw palette values, e.g. `--palette-brand-500:
   #3b82f6`. Never referenced directly by components.
2. **Semantic tokens** — e.g. `--color-accent: var(--palette-brand-
   600)`, `--color-ink-900`, `--color-status-pending`, `--color-nav-bg`.
   **Every component references only these semantic names.** This is
   *why* a component like `Badge.jsx` never needs a `dark:` prefixed
   Tailwind class anywhere in it — dark mode is implemented entirely by
   redefining what the semantic tokens *point to* under a `:root.dark`
   selector, so the exact same `bg-status-pending-bg text-status-
   pending` class names automatically render correctly in both themes
   without the component itself knowing dark mode exists.

**Color identity:** the accent color is a **blue** (`--palette-brand-
600`, roughly `#2563eb`/`#3b82f6`), used for primary buttons, active
nav states, and links. This is a change from an earlier design pass of
this same project, which used a deliberately non-default teal/forest
green specifically to avoid reading as generic SaaS blue — the palette
was revisited and moved to blue in the version this document describes.
Status colors (pending/approved/rejected/cancelled) are their own
separate semantic tokens, independent of the accent.

**Typography:** three font families, loaded from Google Fonts in
`index.html`:
- **Fraunces** (a display serif) — the wordmark and page headlines
  (`.font-display`), and specifically the larger, more spacious
  `.prose-reader` heading style used inside `DocumentReader`.
- **Inter** — the default body font for every dense UI surface (tables,
  forms, nav) where legibility at small sizes matters more than
  character.
- **JetBrains Mono** (`.font-mono`) — used sparingly, for version
  numbers and similar short technical strings.

Two distinct "reading" typographic scales exist on purpose:
- **`.docflow-content`** — compact, UI-scale (matches the editor's own
  `.jc-content` rules) — used inside modals/cards where content is
  shown alongside other dense UI.
- **`.prose-reader`** — larger (17px base, 1.75 line-height), used only
  by `DocumentReader.jsx`'s full-page article view, where the content
  *is* the page rather than one element among many.

**Dark mode:** toggled by `ThemeContext` (§9.4), which adds/removes a
`.dark` class on `<html>`; every dark-mode-specific value is defined
under a `:root.dark { ... }` block redefining the same semantic token
names. Explicitly designed to be **dim, not near-black** — the code
comments in `global.css` record that this went through at least two
rounds of adjustment, the first pass having been judged "too dark," with
the surface colors deliberately lightened afterward to a softer,
"dimmed" dark theme rather than a stark black-and-white inversion.

**The sidebar/header chrome (`--color-nav-*` tokens) is theme-reactive**,
not a fixed dark panel in both light and dark mode. The code comments
record that this, too, was a revision — the sidebar/header were
originally a constant dark-navy panel regardless of the overall theme,
which read as visually jarring against a light page once light mode was
actually being used seriously, so the nav chrome tokens were made to
follow the same light/dark switch as everything else.

**The one deliberate "signature" visual element** in the whole app is
`StageTracker.jsx` (§11.3) — a document's pipeline position rendered as
a literal connected docflow track rather than a generic numbered stepper,
directly reflecting the product's actual mechanic ("handing a document
off, stage to stage") rather than being decorative.

---

## 13. Known inconsistencies, dead code, and open items

Recorded here in the interest of "no doubt about the application" —
these are genuine, current facts about the codebase, not criticisms:

- **`components/layout/PageHeader.jsx` exists but is imported nowhere.**
  Its job (a description line + an action button above a page's content)
  was superseded by `AppLayout`'s own icon/title/count header region
  plus each page rendering its own intro paragraph inline. The file was
  never deleted.
- **`Home.jsx` uses `FilterPanel` but does not call
  `usePageCount`.** Every other list page that uses `FilterPanel` also
  reports its filtered count to the header via `usePageCount`; Home is
  the one exception — its header simply doesn't show a count badge.
  Whether this is intentional (Home's count isn't considered meaningful
  since it's an open public feed) or simply not yet wired up isn't
  stated anywhere in the code itself.
- **The originally-supplied editor project's own `sourceMode`/theme
  plugins remain fully present and reachable through the toolbar** in
  every *writable* `DocumentEditorField` instance (Doc Onboard, Edit,
  Upgrade) — a user can toggle the editor's own independent light/dark
  preference or view/edit raw HTML source directly, entirely separately
  from the app's own `ThemeContext`-driven dark mode. Only the read-only
  `DocumentContentViewer` path forces `syncTheme` and hides the toolbar
  entirely; the writable path's toolbar (and therefore these controls)
  is unrestricted.
- **A stray stale comment** in `backend/src/utils/jwt.js` still refers
  to `shared/utils/tokenHash.js` (the pre-restructuring path); the
  actual `import` statement is correct (`./tokenHash.js`) — this is a
  comment-only artifact of the `shared/utils` → `utils` move (§5.8), not
  a functional bug.
- **`backend/.env` is present in this project archive** alongside
  `.env.example` (normally `.env` is git-ignored and never committed —
  `backend/.gitignore` does list it). Treat any credentials inside it as
  already-shared/non-secret if this archive is ever handed to a third
  party, and rotate them before using this project anywhere real.
- **No automated frontend test suite.** The backend has real end-to-end
  integration tests (`backend/tests/`, curl+jq against a live server —
  see §6.2). The frontend was verified by a full production build
  (catching every import/JSX/syntax error across the whole module
  graph) and by manually cross-checking real backend API response
  shapes against every field each page/component reads — not by an
  automated test suite, and not by driving a real browser end-to-end
  (no headless browser was available in the environment the frontend
  was built in).
- **No dedicated "category" management.** Category remains free text
  everywhere (§5.4) — there is no admin screen for managing an approved
  category list, and no validation constraining what a document's
  category string can be beyond "not empty."

---

## 14. Running the project

```bash
# 1. Database - pick ONE:
psql -f database/postgres/schema.sql your_database_name
#  - or -
cd backend && npm install && npm run migrate && npm run seed

# 2. Backend
cd backend
cp .env.example .env      # fill in DATABASE_URL / JWT secrets / SMTP (optional) / etc.
npm install
npm run dev                # http://localhost:4000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173 - proxies /api/* to the backend above in dev

# 4. Sign in as the seeded admin, then change its password immediately:
#    email:    aditi.singh@docflow.admin
#    password: password
#    (see §8.3 for the 4 additional seeded demo accounts, one per
#    remaining role, all sharing this same placeholder password)

# 5. (optional) Backend integration tests - requires a migrated+seeded DB
#    and the backend already running:
cd backend && npm test
```

`backend/tests/README.md` explains the two test scripts in more detail,
including why re-running the first one twice in a row against the same
database will fail at the registration step (it isn't written to be
idempotent — it's a from-scratch verification) and how to reset between
runs.

`Run_Project.md` at the project root also walks through this same setup
end to end, if a second, narrower "just get it running" reference is
useful alongside this document.



