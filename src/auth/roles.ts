export const USER_ROLES=["admin","operator","viewer"] as const;
export type UserRole=(typeof USER_ROLES)[number];
export type Permission="admin:only"|"domains:read"|"domains:write"|"servers:read"|"servers:write"|"proxy:read"|"proxy:write"|"logs:read"|"settings:read"|"settings:write"|"users:read"|"users:write";
const ROLE_PERMISSIONS:Record<UserRole,readonly Permission[]>={admin:["domains:read","domains:write","servers:read","servers:write","proxy:read","proxy:write","logs:read","settings:read","settings:write","users:read","users:write"],operator:["domains:read","domains:write","servers:read","servers:write","proxy:read","proxy:write","logs:read"],viewer:["domains:read","servers:read","proxy:read","logs:read","settings:read"]};
export function isUserRole(v:unknown):v is UserRole{return typeof v==="string"&&(USER_ROLES as readonly string[]).includes(v)}
export function hasPermission(role:UserRole,permission:Permission):boolean{return ROLE_PERMISSIONS[role].includes(permission)}
export function permissionsForRole(role:UserRole):readonly Permission[]{return ROLE_PERMISSIONS[role]}
export function permissionForApiRequest(method:string,pathname:string):Permission|null{
 const verb=method.toUpperCase(),write=["POST","PUT","PATCH","DELETE"].includes(verb);
 if(pathname==="/api/health"||pathname==="/api/allow-signup"||pathname==="/api/auth-capabilities"||pathname==="/api/auth"||pathname.startsWith("/api/auth/")||pathname==="/api/docs"||pathname.startsWith("/api/docs/"))return null;
 if(pathname==="/api/users"||pathname==="/api/users/")return "users:read";
 if(pathname.startsWith("/api/users/"))return write?"users:write":"users:read";
 if(pathname==="/api/settings/app")return write?"settings:write":"settings:read";
 if(pathname.startsWith("/api/domains"))return write?"domains:write":"domains:read";
 if(pathname.startsWith("/api/servers"))return write?"servers:write":"servers:read";
 if(pathname.startsWith("/api/config"))return write?"proxy:write":"proxy:read";
 if(pathname==="/api/proxy/status"||pathname==="/api/certificates")return "proxy:read";
 if(pathname==="/api/logs")return "logs:read";
 return "admin:only" as Permission;
}
