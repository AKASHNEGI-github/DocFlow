# DocFlow - Frontend

React (Vite) + Tailwind CSS v4. Talks to the backend in `../backend` over
plain REST (`src/api/`) - no server-side rendering, no separate state
management library (React state + context is enough for what this app
actually needs).

## Running it

```bash
npm install
cp .env.example .env.local   # optional - defaults already work with the dev proxy
npm run dev                   # http://localhost:5173
```

`vite.config.js` proxies `/api/*` to `http://localhost:4000` in dev, so
the backend just needs to be running (`cd ../backend && npm run dev`) -
no CORS configuration needed locally. In production, point
`VITE_API_BASE_URL` at wherever the API is actually deployed.

## Structure

```
src/
├── main.jsx, App.jsx, router.jsx      <- entry point, providers, route table
├── api/                               <- one file per backend module, plus client.js
│   └── client.js                      <- fetch wrapper: token storage, auth header, silent refresh-on-401
├── context/
│   ├── AuthContext.jsx                <- session state, login/register/logout
│   └── ToastContext.jsx               <- success/error notifications
├── components/
│   ├── layout/                        <- Sidebar, Topbar, AppLayout, RequireAuth, RequireRole
│   ├── ui/                            <- generic building blocks (Button, Modal, DataTable, Tabs, ...)
│   ├── documents/                     <- domain components (PromoteModal, ApproverActionModal, DocumentForm, StageTracker, ...)
│   └── editor/                        <- the provided rich text editor, copied in wholesale (see its own note below)
├── pages/                             <- one file per route (Home, Dashboard, Draft, Editorial, Review, Publication, Live, Deletion, admin/Users, auth/*)
├── lib/                               <- roles.js, status.js, date.js, constants.js
└── styles/global.css                  <- Tailwind import + the design token theme
```

## The editor

`components/editor/` is the provided Editor project's `components/`,
`core/`, `plugins/`, and `styles/` folders, copied in unmodified, plus
one new `index.js` barrel file for a clean import path. It's a
from-scratch, contentEditable-based rich text editor (no third-party
editor dependency) that already deals in HTML strings natively -
`initialValue` in, sanitized HTML out via `onChange` - which is exactly
the "convert content to HTML and save it to the database" contract this
app needs, with no serialization step to write.
`components/documents/DocumentEditorField.jsx` is the thin wrapper every
document form (Doc Onboard, Edit, Upgrade) actually uses.

## Design system

Defined once, as CSS custom properties in `styles/global.css`'s
`@theme` block (Tailwind v4's CSS-first config - no separate
`tailwind.config.js`):

- **Color**: an editorial/publishing register on purpose, not generic
  SaaS blue - deep ink-navy for structural chrome (sidebar, headers), a
  deliberate teal-forest accent for primary actions and the Live/
  "published" state, warm paper background instead of stark white.
  Status colors (pending/approved/rejected/cancelled) are separate
  semantic tokens, distinct from the brand accent.
- **Type**: Fraunces (a display serif with real character) for the
  wordmark and page headlines; Inter for every dense, data-heavy table
  and form, where legibility at small sizes matters more than
  personality; JetBrains Mono, used sparingly, for version numbers.
- **Signature element**: `components/documents/StageTracker.jsx` renders
  a document's position in the pipeline as a literal docflow track rather
  than a generic numbered stepper, since "handing off phase to phase" is
  the product's actual mechanic, not just a progress indicator.

## Notable decisions

- **Sidebar composition is role-conditional, not just role-labelled.**
  `components/layout/Sidebar.jsx` renders one of two completely different
  navigation sets (content roles vs. admin) - see `RequireRole.jsx` for
  the matching route guards, which redirect rather than show a bare
  "forbidden" page (admin lands on Users, everyone else lands on Home).
- **One `DocumentDetailModal` for every "View" action in the app**,
  regardless of stage - it always calls `GET /documents/:id`, and lets
  the backend's own visibility rule (Live is public; anything else needs
  ownership or an assigned-approver relationship) decide what comes back,
  rather than the frontend trying to guess.
- **`PromoteModal` and `ApproverActionModal` are single reusable
  components parameterized by props**, not copy-pasted per phase -
  Editorial/Review/Publication's near-identical promote/repromote/decide
  flows all render through the same two components with different
  `fetchOptions`/`onSubmit`/labels, the same way the backend's
  `shared/utils/phaseWorkflow.js` avoids re-implementing the same logic
  three times.
- **Every list page fetches both tabs' data up front** (`Promise.all`
  for My Requests + Requests For Approval) rather than lazily on tab
  switch, so the tab counts are correct the moment the page loads and
  switching tabs never shows a loading flash.
