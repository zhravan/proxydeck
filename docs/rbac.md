# Role-based access control

Roles are stored on each Better Auth user record and enforced server-side for all authenticated API requests.

## Roles

| Capability | Admin | Operator | Viewer |
|---|:---:|:---:|:---:|
| Read domains and server inventory | Yes | Yes | Yes |
| Create/update/delete/import/export domains | Yes | Yes | No |
| Create/update/delete/import/export servers | Yes | Yes | No |
| Read proxy configuration, status, certificates and logs | Yes | Yes | Yes |
| Validate/apply/rollback proxy configuration | Yes | Yes | No |
| Read application settings | Yes | No | Yes |
| Change SMTP and authentication settings | Yes | No | No |
| List users and change roles | Yes | No | No |

Operators manage operational resources but cannot change global settings or users. Viewers have read-only access to operational data.

## Migration and first administrator

Run `bun run db:migrate` during deployment. Migration `0004_add_user_roles` promotes the earliest-created existing account to `admin`. Other existing accounts and new accounts default to `viewer`. Signup cannot select a role.

## User-management API

Only admins are allowed:
- `GET /api/users` — list users, roles, and effective permissions.
- `PATCH /api/users/:id/role` with `{"role":"operator"}` — assign `admin`, `operator`, or `viewer`.

The last administrator cannot demote themselves. Roles are read live from the database on each request, so changes take effect immediately.

## Enforcement

GET/HEAD/OPTIONS operations map to read permissions; POST/PUT/PATCH/DELETE map to write permissions. Unclassified API paths fail closed with 403. The previously public proxy status endpoint now requires a session and proxy-read access. Existing owner-scoped domain and server data queries are retained; roles do not grant access to another user's private inventory.
