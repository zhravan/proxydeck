import {describe,expect,test} from "bun:test";
import {hasPermission,permissionForApiRequest} from "../auth/roles";
describe("role based access control",()=>{
 test("admin has every permission",()=>{for(const p of ["domains:read","domains:write","servers:read","servers:write","proxy:read","proxy:write","logs:read","settings:read","settings:write","users:read","users:write"] as const)expect(hasPermission("admin",p)).toBe(true)});
 test("operator can operate services but cannot manage users or instance settings",()=>{expect(hasPermission("operator","domains:write")).toBe(true);expect(hasPermission("operator","servers:write")).toBe(true);expect(hasPermission("operator","proxy:write")).toBe(true);expect(hasPermission("operator","settings:write")).toBe(false);expect(hasPermission("operator","users:write")).toBe(false)});
 test("viewer is read only",()=>{expect(hasPermission("viewer","domains:read")).toBe(true);expect(hasPermission("viewer","domains:write")).toBe(false);expect(hasPermission("viewer","proxy:write")).toBe(false)});
 test("API method mapping covers resource read and write operations",()=>{expect(permissionForApiRequest("GET","/api/domains")).toBe("domains:read");expect(permissionForApiRequest("POST","/api/domains")).toBe("domains:write");expect(permissionForApiRequest("DELETE","/api/servers/1")).toBe("servers:write");expect(permissionForApiRequest("POST","/api/config/apply")).toBe("proxy:write");expect(permissionForApiRequest("PUT","/api/settings/app")).toBe("settings:write");expect(permissionForApiRequest("GET","/api/logs")).toBe("logs:read")});
 test("unknown routes fail closed",()=>expect(permissionForApiRequest("GET","/api/new-feature")).toBe("admin:only"));
 test("health and auth capability endpoints have no role requirement",()=>{expect(permissionForApiRequest("GET","/api/health")).toBeNull();expect(permissionForApiRequest("POST","/api/auth/sign-out")).toBeNull()});
});
