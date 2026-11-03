# Role-based access control

Roles are instance-wide, persisted on the Better Auth user record, and enforced server-side by the API guard. Client-side navigation visibility is never the authorization boundary.

## Built-in roles

| Capability | Admin | Operator | Viewer |
|---|:---:|:---:|:---:|
| Read domains and server inventory | Yes | Yes | Yes |
| Create/update/delete/import/export domains | Yes | Yes | No |
| Create/update/delete/import/export servers | Yes | Yes | No |
| Read proxy configuration, status, certificates and logs | Yes | Yes | Yes |
| Validate/apply/rollback proxy configuration | Yes | Yes | No |
| Read application settings | Yes | No | Yes |
| Change SMTP/authentication settings | Yes | No | No |
| List users and change roles | Yes | No | No |

Admin has every permission. Operator manages operational resources but not global settings or users. Viewer can inspect operational data but cannot mutate it.

## Migration / first admin

Run `bun run db:migrate` during deployment. Migration `0004_add_user_roles` promotes the existing earliest-created account to `admin`; other existing users and all new users default to `viewer`. Never trust role data supplied at signup.

## User management

Only admins can access:
- `GET /api/users` — list users, effective roles and permissions.
- `PATCH /api/users/:id/role` with `{"role":"operator"}` — set `admin`, `operator` or `viewer`.

The last admin cannot demote themselves. Roles are read from the database on each authenticated API request so changes apply immediately.

## Authorization behavior

API methods GET/HEAD/OPTIONS require read permissions; POST/PUT/PATCH/DELETE require write permissions. Unknown API paths fail closed with 403 until a policy is explicitly added. The public exception list is limited to health, signup capability, authentication capability and auth routes. Proxy status is no longer public.

Domain and server data continues to use existing owner-scoped service/repository queries. Roles grant feature access, not access to another user's private portfolio records.
