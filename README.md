# Rent & Flatmate Finder

A simple MERN stack app for owners to list rooms and tenants to find them.
Includes an AI compatibility scoring engine (with a rule-based fallback),
real-time chat, and email notifications.

Tech stack: **MongoDB, Express, React (Vite), Node.js**, plus Socket.IO for
chat and Nodemailer for email.

---

## 1. Project structure

```
rent-flatmate-finder/
├── backend/     Express API + Socket.IO server
└── frontend/    React (Vite) client
```

## 2. Prerequisites

- Node.js 18+
- A MongoDB database (local `mongod`, or a free Atlas cluster)
- (Optional) An Anthropic API key for AI-powered compatibility scoring
- (Optional) SMTP credentials for real email delivery (e.g. Gmail app
  password, Mailtrap, Brevo free tier). Without this, emails are simply
  logged to the backend console — the app still works end-to-end.

## 3. Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your MongoDB URI, JWT secret, and (optionally) LLM/SMTP creds
npm run dev        # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend runs somewhere other than localhost:5000
npm run dev         # starts on http://localhost:5173
```

Open `http://localhost:5173`, register as an **owner** in one browser tab
and a **tenant** in another to try the full flow.

### Creating an admin user

There's no public admin signup (by design). After registering a normal
account, promote it manually in MongoDB:

```js
// in mongosh, connected to your database
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

## 4. Environment variables

**backend/.env**

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |
| `PORT` | Backend port (default 5000) |
| `CLIENT_URL` | Frontend origin, used for CORS/Socket.IO |
| `ANTHROPIC_API_KEY` | Optional. If unset, compatibility scoring uses the rule-based fallback |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-sonnet-4-6` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Optional SMTP creds. If unset, emails are logged to console |
| `EMAIL_FROM` | From address used in outgoing emails |

**frontend/.env**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend, e.g. `http://localhost:5000` |

## 5. Database schema

**User**
| Field | Type | Notes |
|---|---|---|
| name | String | |
| email | String | unique |
| password | String | bcrypt hash |
| role | enum | `tenant`, `owner`, `admin` |
| isActive | Boolean | admin can suspend accounts |

**Listing**
| Field | Type | Notes |
|---|---|---|
| owner | ObjectId → User | |
| location | String | |
| rent | Number | |
| availableFrom | Date | |
| roomType | enum | single/shared/studio/1bhk/2bhk/other |
| furnishingStatus | enum | furnished/semi-furnished/unfurnished |
| description | String | |
| photos | [String] | photo URLs |
| isFilled | Boolean | hides listing from search when true |

**TenantProfile**
| Field | Type | Notes |
|---|---|---|
| tenant | ObjectId → User | unique, one profile per tenant |
| preferredLocation | String | |
| budgetMin / budgetMax | Number | |
| moveInDate | Date | |
| notes | String | |

**Interest** (a tenant's request to an owner's listing)
| Field | Type | Notes |
|---|---|---|
| tenant | ObjectId → User | |
| listing | ObjectId → Listing | |
| owner | ObjectId → User | denormalized for fast owner queries |
| status | enum | pending/accepted/declined |
| compatibilityScore | Number | 0–100, computed once and stored |
| compatibilityExplanation | String | stored alongside the score |
| scoreSource | enum | `llm` or `rule-based` |

Unique index on `(tenant, listing)` — a tenant can only express interest
once per listing.

**Message**
| Field | Type | Notes |
|---|---|---|
| interest | ObjectId → Interest | chat is scoped to an accepted interest |
| sender | ObjectId → User | |
| text | String | |

## 6. API reference

All authenticated routes expect `Authorization: Bearer <token>`.

**Auth**
- `POST /api/auth/register` — `{ name, email, password, role: tenant|owner }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — current user

**Listings**
- `POST /api/listings` (owner) — create listing
- `GET /api/listings?location=&minBudget=&maxBudget=` — browse/filter; ranked
  by compatibility score if called with a tenant's token
- `GET /api/listings/mine` (owner) — owner's own listings
- `GET /api/listings/:id` — listing detail
- `PATCH /api/listings/:id` (owner) — update
- `PATCH /api/listings/:id/fill` (owner) — mark as filled
- `DELETE /api/listings/:id` (owner)

**Tenant profile**
- `PUT /api/profile` (tenant) — create/update (upsert)
- `GET /api/profile` (tenant)

**Interests**
- `POST /api/interests` (tenant) — `{ listingId }`. Computes + stores
  compatibility score, emails the owner (flagging matches ≥ 80)
- `GET /api/interests/sent` (tenant)
- `GET /api/interests/received` (owner)
- `PATCH /api/interests/:id` (owner) — `{ status: accepted|declined }`,
  emails the tenant
- `GET /api/interests/:id` — fetch one (participants or admin only)

**Chat**
- `GET /api/chat/:interestId/messages` — history (only once accepted)
- WebSocket events (Socket.IO, JWT passed via `auth.token` on connect):
  - `join_room` (emit) — `interestId`
  - `send_message` (emit) — `{ interestId, text }`
  - `receive_message` (listen) — broadcast to the room
  - `error_message` (listen) — access/validation errors

**Admin**
- `GET /api/admin/overview` — platform stats
- `GET /api/admin/users` / `PATCH /api/admin/users/:id/toggle-active`
- `GET /api/admin/listings` / `DELETE /api/admin/listings/:id`

### LLM prompt & example I/O

Prompt template (see `backend/utils/compatibility.js`):

```
Given this room listing: {listing JSON} and this tenant profile: {profile JSON},
compute a compatibility score from 0 to 100 based on budget and location match.
Return ONLY valid JSON in this exact shape and nothing else:
{ "score": number, "explanation": string }
```

Example input:
```json
{
  "listing": { "location": "Koramangala, Bangalore", "rent": 18000, "roomType": "single", "furnishingStatus": "furnished" },
  "profile": { "preferredLocation": "Koramangala", "budgetMin": 15000, "budgetMax": 20000 }
}
```

Example LLM output:
```json
{ "score": 92, "explanation": "Great location match and rent comfortably within the tenant's budget range." }
```

If the LLM call fails, times out, is unconfigured, or returns malformed
JSON, the backend automatically falls back to `ruleBasedScore()`, a
deterministic 50% location + 50% budget-proximity formula, so the feature
never breaks.

## 7. System design write-up (≤ 800 words)

**Compatibility scoring.** Each tenant maintains a single `TenantProfile`
(preferred location, budget range, move-in date). When a tenant expresses
interest in a listing, the backend calls `computeCompatibility(listing,
profile)` exactly once, at that moment, and persists the resulting
`compatibilityScore`, `compatibilityExplanation`, and `scoreSource` on the
`Interest` document. This satisfies the requirement that scores are stored
and not recomputed on every request. For the listings *browse* page, scores
are computed on the fly per request (not persisted) so the ranking reflects
the tenant's current profile even before they commit to an interest; this
is a deliberate trade-off between freshness and DB writes — it's cheap
because the number of open listings a tenant sees is small, and the score
becomes permanent only once real interest (and therefore an email to the
owner) is involved.

**LLM integration and fallback.** `utils/compatibility.js` exposes three
functions: `llmScore()`, `ruleBasedScore()`, and the public
`computeCompatibility()` which tries the LLM first and falls back
automatically. The LLM call uses the Anthropic Messages API directly
(`axios.post` to `api.anthropic.com/v1/messages`) with an 8-second timeout,
asks for strict JSON output, and validates the shape of the response
(`score` must be a number 0–100, `explanation` a string) before trusting
it. Any failure mode — missing API key, network error, timeout, malformed
JSON, out-of-range score — silently returns `null`, and the caller falls
through to the deterministic rule-based scorer instead of surfacing an
error to the user. The rule-based scorer weights location match (exact or
substring, case-insensitive) at 50% and budget fit at 50%, with a linear
decay for rent outside the tenant's range, so it degrades gracefully rather
than returning nonsense. This guarantees the "Express interest" flow never
breaks even with zero LLM configuration, which is also why the app ships
with `ANTHROPIC_API_KEY` blank by default and still fully functions.

**Chat implementation.** Real-time chat is scoped to an `Interest` document
rather than being a generic DM system — this mirrors the product
requirement that chat only unlocks once an owner accepts a tenant's
interest. Socket.IO authenticates each socket connection via JWT passed in
the `auth` handshake payload (verified with the same secret as the REST
API), then uses the `interestId` as both the access-control key and the
Socket.IO room name. Before allowing a client to `join_room` or
`send_message`, the server re-fetches the `Interest` from MongoDB and
checks (a) the requester is one of its two participants and (b) its status
is `accepted` — so even a stale or forged client can't read or write
messages for a conversation it isn't part of, or before acceptance.
Messages are persisted to a `Message` collection (referencing the
`Interest`) synchronously before being broadcast, so chat history survives
reconnects and is also available over plain REST
(`GET /api/chat/:interestId/messages`) for the initial page load — sockets
are used only for the live/incremental part, REST for the historical part.

**Notification flow.** `utils/email.js` wraps Nodemailer behind a single
`sendEmail()` function that gracefully no-ops into a console log if SMTP
env vars aren't set, so the app is fully runnable without any email
provider configured — useful for local dev and grading without needing
real credentials. Two notification touchpoints exist: (1) when a tenant
expresses interest, the owner is emailed immediately, with the subject
line flagging "Strong match" if the freshly-computed score is ≥ 80, per
the spec's high-compatibility threshold; (2) when an owner accepts or
declines, the tenant is emailed the outcome. Both emails are fire-and-forget
relative to the HTTP response — they're awaited before responding to keep
the implementation simple, but failures are caught and logged rather than
failing the underlying API call, so a broken SMTP config can't block core
functionality like accepting an interest.

**Database schema and data modelling.** The five collections
(`User`, `Listing`, `TenantProfile`, `Interest`, `Message`) map directly to
the product's entities, with `Interest` acting as the join/state entity
between a tenant, a listing, and (denormalized) its owner — this
denormalization avoids an extra populate/join when an owner lists
"requests received." A unique compound index on `(tenant, listing)`
prevents duplicate interest spam. Filled listings are excluded from the
default browse query (`isFilled: false`) rather than deleted, preserving
history for the admin dashboard and existing chats.

**API design and code structure.** Routes are grouped by resource
(`authRoutes`, `listingRoutes`, `profileRoutes`, `interestRoutes`,
`chatRoutes`, `adminRoutes`), each a thin Express router; cross-cutting
concerns (JWT verification, role checks) live in `middleware/auth.js` as
`protect` and `authorize(...roles)`, composed per-route. Business logic
that's reused across routes (scoring, email) is isolated in `utils/`, kept
free of Express-specific code so it's independently testable.

---

## 8. Deploying

Any Node-friendly host works (Render, Railway, Fly.io, a VPS, etc.):

1. Deploy `backend/` as a Node web service; set all backend env vars
   there (use a hosted MongoDB, e.g. Atlas free tier).
2. Deploy `frontend/` as a static site (`npm run build` → serve `dist/`),
   e.g. on Vercel/Netlify, with `VITE_API_URL` pointing at your backend's
   public URL.
3. Set `CLIENT_URL` on the backend to your deployed frontend's URL so CORS
   and Socket.IO both allow it.
