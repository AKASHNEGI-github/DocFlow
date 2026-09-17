# Backend integration tests

Two bash scripts that exercise the real API end-to-end against a real
Postgres database (curl + jq, no test framework/mocking - these hit the
actual running server). This is how the backend was verified while it
was being built, not an afterthought.

Run in order, against a freshly migrated + seeded database:

```
# from backend/, with the server already running (npm run dev) and
# DATABASE_URL pointed at a real, migrated, seeded Postgres:
bash tests/smoke_test_1_full_lifecycle.sh
bash tests/smoke_test_2_reject_cancel_reset.sh
```

**Script 1** walks one document through the entire happy-path lifecycle:
Doc Onboard -> Draft -> Editorial -> Review -> Publication -> Live ->
Upgrade -> Deletion (all 3 approvers), asserting the exact stage and
status at every step, including the concurrency guards (one upgrade in
flight per family, deletion blocked while an upgrade is in flight, an
approver can't act twice).

**Script 2** covers the paths script 1 doesn't: an Editor's Reject and a
Reviewer's Reject (verifying documents.stage reverts down a level, while
the document keeps *displaying* at the phase it was rejected at, per the
Core Navigation Rule), Cancel, a non-assigned approver being blocked,
re-promoting after rejection, the full forgot-password/reset-password
flow, and an admin role change.

Both scripts use `set -euo pipefail` and fail loudly (non-zero exit, and
print the expected-vs-actual value) on the first assertion that doesn't
hold, rather than continuing past a broken state.

Re-running script 1 twice in a row against the same database will fail
at the register step (the email already exists) - it isn't written to
be idempotent, since its purpose is a from-scratch verification. Re-seed
the database (`npm run migrate:rollback && npm run migrate && npm run
seed`) between full runs, or just run script 2 (which uses different,
fixed emails and doesn't collide) on its own.
