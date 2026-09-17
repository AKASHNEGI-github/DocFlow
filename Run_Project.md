0. Prerequisites

Node.js 18+
Postgres 14+ (recommended — this is what the app is built and tested against). MySQL 8+ works too if you use the MySQL schema file instead, but see the caveats in the README.

1. Get a database running — pick one path

Option A, knex (what the backend actually uses day-to-day):

bash
cd backend
cp .env.example .env
# edit .env — set DATABASE_URL, e.g.:
# DATABASE_URL=postgres://docflow:docflow@localhost:5432/docflow
npm install
npm run migrate
npm run seed

Option B, plain SQL (no knex, no Node needed for this step):

bash
createdb docflow
psql -d docflow -f database/postgres/schema.sql

Option C, MySQL instead of Postgres:

bash
mysql -u root -e "CREATE DATABASE docflow;"
mysql -u root docflow < database/mysql/schema.sql

If you go this route, the backend's knexfile.js/config/db.js are wired for pg — you'd need to swap the driver (mysql2) and connection config yourself; that part isn't built, since Postgres is the real target.

2. Start the backend

bash
cd backend
npm install          # skip if you already did this in step 1
npm run dev           # http://localhost:4000

Check it's alive: curl http://localhost:4000/health

3. Start the frontend (new terminal)

bash
cd frontend
npm install
npm run dev            # http://localhost:5173

Its dev server proxies /api to localhost:4000 automatically — no extra config needed.

4. Log in
Open http://localhost:5173, sign in with the seeded admin:

Email: aditi.singh@docflow.admin
Password: password

Change that password immediately (Profile → Change password). 4 more demo accounts, one per remaining role (editor/reviewer/publisher/author), are already seeded with the same placeholder password - see ProjectInfo.md §8.3 - or use Users / Register to create your own.

5. (Optional) Run the integration tests
With the backend running against a migrated + seeded database:

bash
cd backend
npm test

One thing worth flagging: nothing here runs both apps together automatically (no root-level script, no Docker Compose) — it's two plain npm projects you start side by side in two terminals, as shown above.