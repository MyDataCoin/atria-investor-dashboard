# Support tickets — shared API contract

This is the single source of truth that links the **investor dashboard** and the
**separate admin panel**. Neither app can reach the other directly; they only
meet through these backend endpoints. The investor client
([`src/api/tickets.js`](../src/api/tickets.js)) already calls them (behind the
`VITE_TICKETS_API=1` flag) — the admin repo must call the same routes.

> Status: **LIVE.** All five `/support/*` paths are present in the OpenAPI spec
> (`/swagger/v1/swagger.json`) and the investor client talks to them by default.
> Set `VITE_TICKETS_API=0` only to force the offline localStorage fallback.

## Auth & roles

Same JWT Bearer scheme as the rest of the API. Scope is decided **server-side**
from the token's role — the client never asks for "all" vs "mine":

- **Investor** — `GET /support/tickets` returns only their own tickets; they can
  open tickets, reply, and close their own.
- **Admin** — `GET /support/tickets` returns **all** tickets; they can read any
  ticket, reply (author recorded as `support`), and close/reopen.

Message `author` is derived from the caller's role, never trusted from the body.

## Endpoints

All under `/api/v1`.

| Method | Path                              | Role            | Body                          | Returns        |
|--------|-----------------------------------|-----------------|-------------------------------|----------------|
| GET    | `/support/tickets`                | Investor, Admin | —                             | `Ticket[]`     |
| GET    | `/support/tickets/{id}`           | owner or Admin  | —                             | `Ticket`       |
| POST   | `/support/tickets`                | Investor        | `{ subject, category, body }` | `Ticket` (201) |
| POST   | `/support/tickets/{id}/messages`  | owner or Admin  | `{ body }`                    | `Message` (201)|
| POST   | `/support/tickets/{id}/close`     | owner or Admin  | —                             | `204`          |

Admin-only extras (optional, nice to have for the panel; investor client does not
use them):

| Method | Path                            | Body        | Notes                                   |
|--------|---------------------------------|-------------|-----------------------------------------|
| GET    | `/support/tickets?status=open`  | —           | filter by `open` \| `pending` \| `closed` |
| POST   | `/support/tickets/{id}/reopen`  | —           | closed → open                           |

A reply from an admin should set status to `pending` (waiting on investor); a
reply from the investor should set it back to `open`. Closing sets `closed`.

## DTOs

Timestamps are UTC ISO-8601 with the `...Utc` suffix, matching the rest of the API
(e.g. `notifications`, `investments`).

### Ticket

```jsonc
{
  "id": "uuid",
  "subject": "string (<= 120 chars)",
  "category": "KYC | Платежи | Инвестиции | Документы | Другое",
  "status": "open | pending | closed",
  "createdAtUtc": "2026-07-09T12:00:00Z",
  "updatedAtUtc": "2026-07-09T12:34:00Z",
  // present for Admin list/detail so the panel can show who opened it:
  "investor": { "id": "uuid", "fullName": "string | null" },
  "messages": [ /* Message[] — newest last; may be omitted on the list route */ ]
}
```

### Message

```jsonc
{
  "id": "uuid",
  "author": "investor | support",   // derived from caller role, not the body
  "authorName": "string | null",     // optional display name (admin panel)
  "body": "string",
  "createdAtUtc": "2026-07-09T12:34:00Z"
}
```

The investor client maps `author: "admin"` to `support` defensively, so either
label is accepted for admin messages — but please emit `support`.

## Errors

Standard RFC-7807 `application/problem+json`, same as every other route. The
investor client surfaces `problem.detail` / `problem.title` to the user.

## Turning it on

1. Backend implements the endpoints above.
2. Admin repo reads/writes the same routes (Admin role → full scope).
3. Investor dashboard: set `VITE_TICKETS_API=1` in `.env.local` and redeploy.
   No UI change is required — [`tickets.js`](../src/api/tickets.js) already maps
   the DTOs to what the help desk renders.
