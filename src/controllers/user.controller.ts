import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { user } from "../db/schema";
import { getUserIdFromRequest } from "../http/sessionUser";
import { isUserRole, permissionsForRole, USER_ROLES, type UserRole } from "../auth/roles";
import { jsonResponse } from "../http/json";

export const userRoutes = new Elysia().group("/api/users", (app) =>
  app.get("/", async ({ request }) => {
    const actorId = await getUserIdFromRequest(request);
    if (!actorId) return jsonResponse({ error: "Unauthorized" }, 401);
    const rows = await db.select({
      id:user.id,name:user.name,email:user.email,username:user.username,role:user.role,createdAt:user.createdAt,
    }).from(user).orderBy(user.createdAt);
    return jsonResponse({ roles:USER_ROLES, users:rows.map((entry) => ({
      ...entry, permissions:permissionsForRole(entry.role as UserRole),
    })) });
  }).patch("/:id/role", async ({ request, params }) => {
    const actorId = await getUserIdFromRequest(request);
    if (!actorId) return jsonResponse({ error:"Unauthorized" },401);
    let body: unknown;
    try { body = await request.json(); } catch { return jsonResponse({ error:"Invalid JSON body" },400); }
    const role = body && typeof body === "object" ? (body as { role?: unknown }).role : null;
    if (!isUserRole(role)) return jsonResponse({ error:"role must be admin, operator, or viewer" },400);
    if (params.id === actorId && role !== "admin") {
      const admins = await db.select({ id:user.id }).from(user).where(eq(user.role,"admin"));
      if (admins.length <= 1) return jsonResponse({ error:"The last administrator cannot demote themselves" },409);
    }
    const result = await db.update(user).set({role,updatedAt:new Date()})
      .where(eq(user.id,params.id)).returning({id:user.id,role:user.role});
    if (!result.length) return jsonResponse({error:"User not found"},404);
    return jsonResponse({user:result[0],permissions:permissionsForRole(role)});
  })
);
