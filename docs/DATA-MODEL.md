# Data model

MongoDB collections, how they relate, and the indexes that matter.

## Entity relationships

```
Role ──< User ──< Loan >── ResourceCopy >── Resource >── Author (many-to-many)
                   │                                      │
                   ├──< Renewal                           ├── Publisher
                   ├──< Fine ──< FinePayment              ├── Category ──< Subject
                   ├──< Reservation                       └── Language
                   ├──< Clearance
                   └──< Notification

Faculty ──< Department ──< Program
Faculty/Department also classify User and Resource

Shelf ──< ResourceCopy
StudySpace ──< ReadingGroupSession >── ReadingGroup >── User (members)
                        └──< ReadingGroupAttendance

InventoryAudit ──< audit items ──> ResourceCopy
DigitalResource ──> Faculty / Department / Author
AuditLog       (append-only, references any entity)
SystemSetting  (single global document)
RefreshToken   ──> User
```

## The central decision: titles and copies are different things

A catalogue record (`Resource`) is the bibliographic title. A `ResourceCopy` is
one shelvable physical item with its own accession number, barcode, shelf,
condition and status.

Availability is derived from copies, never from a counter someone might forget
to update. `Resource.totalCopies` / `availableCopies` / `borrowedCopies` are
denormalised for fast listings and recomputed by `resourceService.syncAvailability`
after every change that could affect them.

## Collections

### Identity and access

| Collection     | Purpose                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `Role`         | `key`, `name`, `level`, `permissions[]`. Level blocks privilege escalation. |
| `User`         | Members and staff. Carries denormalised `activeLoanCount` and `outstandingFineTotal` for listings (never the source of truth for eligibility.) |
| `RefreshToken` | SHA-256 hash of each issued refresh token, with rotation and revocation metadata. TTL index reaps expired rows. |

`User` holds `passwordChangedAt`; access tokens carry that exact millisecond
stamp so a token minted before a password change is rejected.

### Reference data

`Faculty`, `Department`, `Program`, `Category`, `Subject`, `Publisher`,
`Language`, `Shelf`, `StudySpace`, `Author`.

They share a base shape (`code`, `name`, `description`, `isActive`) plus
soft-delete and authorship fields, which is why one generic controller serves
all of them. Deletion is refused while live records still point at an entry.

### Catalogue

| Collection     | Notes                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| `Resource`     | Bibliographic record. Text index over title/subtitle/description/keywords with weights. Unique partial index on `isbn` so many records may have none. |
| `ResourceCopy` | One physical item. Unique `accessionNumber` and `barcode`. `currentLoan` points at the open loan, if any. |

### Circulation

| Collection    | Notes                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| `Loan`        | Never hard-deleted. **Unique partial index on `copy` for `active`/`overdue` status** (the database itself prevents two open loans on one copy.) |
| `Renewal`     | Immutable trail: previous due date, new due date, who and through which channel. |
| `Reservation` | Queue position derives from `createdAt` among pending holds. Unique partial index stops one member holding the same title twice. |
| `Fine`        | `amount`, `amountPaid`, `amountWaived`; `balance` is a virtual that can never go negative. A pre-validate hook refuses payments exceeding the charge. |
| `FinePayment` | Ledger of payments, waivers and adjustments, each with a receipt number. |

### Library operations

| Collection                | Notes                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `DigitalResource`         | `storageKey` is `select: false` and stripped from every response. `accessLevel` plus optional `allowedRoles` drive both listing filters and the download check. |
| `InventoryAudit`          | Embeds scanned items; re-scanning a copy replaces its entry rather than appending. |
| `Clearance`               | Stores the obligation snapshot *at approval* so a printed certificate stays accurate. Unique partial index allows one open case per member. |
| `ReadingGroup` / `Session` / `Attendance` | Sessions store absolute `startsAt`/`endsAt`, which turns double-booking detection into a plain interval-overlap query. Attendance is unique per (session, member). |

### System

| Collection      | Notes                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| `Notification`  | In-app messages with a per-channel delivery record and a `dedupeKey` that makes nightly jobs idempotent. |
| `AuditLog`      | Append-only: Mongoose pre-hooks reject every update and delete. Redacts secrets before writing diffs. |
| `SystemSetting` | One global document holding institution details, borrowing rules, fine policies, circulation rules and opening hours. |

## Indexes

Beyond the unique keys above:

- **Text search**: `Resource` (title, subtitle, description, keywords, weighted),
  `DigitalResource` (title, abstract, keywords, authors), `User`, `Author`.
  Both resource text indexes set `language_override: 'textLanguage'` because
  `language` is a reference field here, not a text-analyser hint.
- **Exact lookups**: `email`, `registrationNumber`, `employeeId`, `barcode`,
  `isbn`, `issn`, `accessionNumber`.
- **Compound**: `Loan(user, status)`, `Loan(status, dueDate)`,
  `Reservation(resource, status, createdAt)`, `Fine(user, status)`,
  `ResourceCopy(resource, status)`, `User(status, role)`,
  `ReadingGroupSession(space, startsAt, endsAt)`.
- **TTL**: `RefreshToken.expiresAt`, so MongoDB reaps dead sessions.

## Integrity rules enforced in the model layer

These do not depend on application code remembering to check:

1. A copy can have at most one open loan (unique partial index).
2. A member can hold at most one open reservation per title (unique partial index).
3. A member can have at most one open clearance case (unique partial index).
4. Accession numbers and barcodes are globally unique.
5. Fine payments plus waivers can never exceed the charge (pre-validate hook).
6. Audit entries cannot be updated or deleted (pre-hooks reject the operation).
7. Soft-deleted records disappear from ordinary queries unless a caller opts in.
