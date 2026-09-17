# API overview

Base URL: `/api/v1` · Interactive reference: <http://localhost:5000/api-docs>

This document gives the shape of the API and the rules behind it. The OpenAPI
specification is authoritative for individual parameters.

## Conventions

Every response uses the same envelope:

```jsonc
// success
{ "success": true, "message": "Item issued successfully", "data": { } }

// list (always server-paginated)
{ "success": true, "message": "Success", "data": [ ], "meta": {
    "page": 1, "limit": 20, "total": 137, "totalPages": 7,
    "hasNextPage": true, "hasPrevPage": false } }

// failure
{ "success": false, "message": "Validation failed",
  "errors": [{ "field": "title", "message": "Title is required" }] }
```

Documents always serialise with `id`, never `_id` or `__v`, whether they came
from a full document read or a `lean()` list query. Secrets (password hashes,
token hashes, repository storage keys) are stripped centrally, so an endpoint
cannot leak them by forgetting a `select`.

| Status | Meaning                                                       |
| ------ | ------------------------------------------------------------- |
| 400    | Well-formed but not permitted by a business rule              |
| 401    | Missing, invalid or stale token                               |
| 403    | Authenticated but lacking the permission                      |
| 404    | Not found (also returned for a repository item you may not read) |
| 409    | Conflicts with existing data or a circulation rule            |
| 422    | Failed request validation, with per-field `errors`            |
| 429    | Rate limited                                                  |

List endpoints accept `page`, `limit` (max 200), `sort`, `order`, `search` and
domain filters. Export endpoints accept `format=xlsx|csv|pdf` and stream a file
built from exactly the same rows and filters as the JSON response.

## Authentication

```http
POST /auth/login          { identifier, password }   → access token + refresh cookie
POST /auth/refresh                                    → rotates the session
POST /auth/logout                                     → revokes the presented token
GET  /auth/me                                         → account + effective permissions
POST /auth/change-password
POST /auth/forgot-password / /auth/reset-password
POST /auth/revoke-sessions
```

`identifier` accepts an email address, a registration number or a staff ID.
Send the access token as `Authorization: Bearer <token>`.

Refresh tokens rotate on every use. Presenting an already-rotated token is
treated as theft and revokes every session for that account. Failed sign-ins
lock an account temporarily, and both success and failure are audited.

## Authorization

Permissions are `<domain>:<action>` strings. `GET /auth/me` returns the
effective set for the signed-in account, which is what the interface uses to
decide what to show. The server checks independently on every request.

Two patterns recur:

- **Scoped listing.** `GET /loans` returns everything to a holder of
  `loan:view`, but only the caller's own rows to a holder of `loan:view_own`,
  including when they pass someone else's `user` filter.
- **Ownership or permission.** Detail routes allow the owner *or* a holder of
  the elevated permission.

## Circulation

```http
GET  /loans/eligibility?userIdentifier=REG/2026/0001
POST /loans/issue    { userIdentifier, copyIdentifier, dueDate?, notes? }
POST /loans/return   { copyIdentifier | loanId, condition, notes? }
POST /loans/{id}/renew
POST /loans/{id}/lost { reason }
GET  /loans/{id}/receipt        → PDF
```

`eligibility` returns *all* blockers at once rather than the first one, so the
desk can resolve them before scanning anything:

```jsonc
{ "eligible": false,
  "blockers": ["2 item(s) are overdue and must be returned first",
               "Outstanding fines of 12.00 exceed the 10.00 limit"],
  "limits": { "maxBooks": 3, "activeLoans": 2, "remaining": 1,
              "loanPeriodDays": 14, "maxRenewals": 1 } }
```

Issuing validates eligibility, claims the copy with a conditional update, sets
the due date from the member's role policy and completes any hold they had.
A reserved copy is only released to the member it is held for.

Returning calculates overdue days and condition charges, routes the copy to the
shelf (`good`), quarantine (`damaged` → `under_repair`) or write-off (`lost`),
and promotes the next reservation when the copy becomes shelf-ready. The
response reports what happened:

```jsonc
{ "loan": { "status": "returned" }, "daysOverdue": 10,
  "fines": [{ "fineCode": "FN-…", "fineType": "overdue", "amount": 5 }],
  "reservationPromoted": true, "copyStatus": "available" }
```

Renewal extends from the current due date, so renewing early never shortens a
loan; an overdue loan restarts from today instead. It is refused when the
renewal limit is reached, another member is waiting, or blocking fines exist.

## Fines

```http
GET  /fines?outstandingOnly=true
POST /fines                     { user, fineType, amount, reason }
POST /fines/{id}/payments       { amount, method, reference? }
POST /fines/{id}/waive          { amount?, reason }
GET  /fines/summary
GET  /fines/{id}/receipt        → PDF
```

A payment larger than the balance is refused. A waiver needs a reason of at
least five characters, requires `fine:waive`, and is audited against the
approving officer. Member balances update on every change.

## Digital repository

```http
GET  /digital-resources
POST /digital-resources          (multipart: file + metadata)
GET  /digital-resources/{id}/download
```

Six access levels: `public`, `university`, `students`, `staff`, `librarians`,
`restricted`. One function decides both what appears in a listing and whether a
download proceeds, so an item that never appears in a listing cannot be fetched
by id either. The API answers `404`, identical to a genuine miss, and does not
disclose that the record exists.

Uploads must match on both MIME type and file extension, and stay within the
configured size limit. Storage keys are never returned. Every download is
audited.

## Clearance

```http
GET  /clearance/check?identifier=REG/2026/0001
POST /clearance                      { user }
POST /clearance/{id}/approve         { comments?, override?, overrideReason? }
POST /clearance/{id}/reject          { reason }
GET  /clearance/{id}/certificate     → PDF
```

Obligations (items on loan, overdue items, lost items and unpaid fines) are
re-evaluated **at the moment of approval**, so a stale "pending" record can
never be used to grant clearance. Approving despite live obligations requires
`override: true`, a reason of at least ten characters, and the
`clearance:override` permission; the override, its reason and the officer are
written to the audit trail, and the certificate records the obligations that
were outstanding at the time.

## Reading groups

```http
GET  /reading-groups
POST /reading-groups
POST /reading-groups/{id}/members            { add: [], remove: [] }
POST /reading-groups/sessions                { group, space, sessionDate, startTime, endTime }
POST /reading-groups/sessions/{id}/attendance { entries: [{ user, status, remark? }] }
GET  /reading-groups/schedule?from=&to=
```

Sessions store absolute instants, so a double booking is a plain interval
overlap: two bookings of the same space collide when each starts before the
other ends. Adjacent bookings (10:00–12:00 then 12:00–14:00) are allowed;
overlapping, enclosing and identical windows are refused with the conflicting
group named. Expected attendance may not exceed the space capacity. Attendance
can only be recorded for members of the group, and re-posting corrects the
earlier record rather than duplicating it.

## Reports

```http
GET /reports                          → the report catalogue
GET /reports/{key}?from=&to=&format=  → JSON, XLSX, CSV or PDF
GET /reports/overview
```

Each report declares its columns and a loader once; the controller renders those
same rows in every format. Adding a report needs no new endpoint and no new
export code.

## Dashboards

```http
GET /dashboard/admin      GET /dashboard/librarian      GET /dashboard/me
```

Aggregated server-side with MongoDB pipelines and returned ready to render. The
client never computes totals from raw records.

## Administration

```http
GET/PATCH /settings          (public branding at /settings/public)
GET/POST/PATCH /roles        GET /roles/permissions
GET /audit-logs
GET/POST/PATCH/DELETE /reference/{collection}/{id}
```

Reference collections: `faculties`, `departments`, `programs`, `categories`,
`subjects`, `publishers`, `languages`, `shelves`, `study-spaces`. Deleting one
that live records still point at is refused, with the count and the suggestion
to deactivate instead.

Audit logs are read-only over HTTP and append-only in the database.

## Rate limits

600 requests per 15 minutes per IP overall; 20 for authentication endpoints; 60
for uploads. Exceeding a limit returns `429` with the standard envelope.
