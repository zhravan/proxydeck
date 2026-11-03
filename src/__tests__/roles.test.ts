import { describe, expect, test } from "bun:test";
import { hasPermission, permissionForApiRequest } from "../auth/roles";

describe("RBAC", () => {
  test("admin can do everything", () => {
    for (const p of ["domains:read","domains:write","servers:read","servers:write","proxy:read","proxy:write","logs:read","settings:read","settings:write","users:read","users:write"] as const)
      expect(hasPermission("admin",p)).toBe(true);
  });
  test("operator manages domain/server/proxy but not global settings or users", () => {
    expect(hasPermission("operator","domains:write")).toBe(true);
    expect(hasPermission("operator","servers:write")).toBe(true);
    expect(hasPermission("operator","proxy:write")).toBe(true);
    expect(hasPermission("operator","settings:write")).toBe(false);
    expect(hasPermission("operator","users:write")).toBe(false);
  });
  test("viewer is read-only", () => {
    expect(hasPermission("viewer","domains:read")).toBe(true);
    expect(hasPermission("viewer","domains:write")).toBe(false);
    expect(hasPermission("viewer","proxy:write")).toBe(false);
  });
  test("resource API methods map to read/write permissions", () => {
    expect(permissionForApiRequest("GET","/api/domains")).toBe("domains:read");
    expect(permissionForApiRequest("POST","/api/domains")).toBe("domains:write");
    expect(permissionForApiRequest("DELETE","/api/servers/id")).toBe("servers:write");
    expect(permissionForApiRequest("POST","/api/config/apply")).toBe("proxy:write");
    expect(permissionForApiRequest("PUT","/api/settings/app")).toBe("settings:write");
    expect(permissionForApiRequest("GET","/api/logs")).toBe("logs:read");
  });
  test("unknown API routes are denied by default", () => {
    expect(permissionForApiRequest("GET","/api/not-classified")).toBe("admin:only");
  });
  test("public health/auth capability paths do not require a role", () => {
    expect(permissionForApiRequest("GET","/api/health")).toBeNull();
    expect(permissionForApiRequest("POST","/api/auth/sign-out")).toBeNull();
  });
});
