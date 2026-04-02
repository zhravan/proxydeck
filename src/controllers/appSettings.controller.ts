import { Elysia } from "elysia";
import { jsonResponse, readJsonBody, toResponse } from "../http/json";
import { getUserIdFromRequest } from "../http/sessionUser";
import {
  type AppSettingsUpdateBody,
  getAppSettingsPublic,
  updateAppSettingsFromUser,
} from "../services/appSettings.service";

const openapi = { tags: ["settings"] as string[] };

function parseSettingsUpdate(raw: unknown): AppSettingsUpdateBody {
  if (raw === null || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: AppSettingsUpdateBody = {};

  if ("forgotPasswordEnabled" in o) out.forgotPasswordEnabled = Boolean(o.forgotPasswordEnabled);
  if ("emailVerificationEnabled" in o) out.emailVerificationEnabled = Boolean(o.emailVerificationEnabled);
  if ("requireVerifiedSignIn" in o) out.requireVerifiedSignIn = Boolean(o.requireVerifiedSignIn);
  if ("smtpHost" in o && typeof o.smtpHost === "string") out.smtpHost = o.smtpHost;
  if ("smtpFrom" in o && typeof o.smtpFrom === "string") out.smtpFrom = o.smtpFrom;
  if ("smtpUser" in o && typeof o.smtpUser === "string") out.smtpUser = o.smtpUser;
  if ("smtpSecure" in o) out.smtpSecure = Boolean(o.smtpSecure);
  if ("smtpPort" in o && o.smtpPort !== undefined) {
    const n = Number(o.smtpPort);
    if (Number.isFinite(n)) out.smtpPort = n;
  }
  if ("smtpPassword" in o) {
    if (o.smtpPassword === null) out.smtpPassword = null;
    else if (typeof o.smtpPassword === "string") out.smtpPassword = o.smtpPassword;
  }

  return out;
}

export const appSettingsRoutes = new Elysia().group("/api/settings", (app) =>
  app
    .get(
      "/app",
      async ({ request }) => {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
        return toResponse({ status: 200, body: await getAppSettingsPublic() });
      },
      {
        detail: {
          ...openapi,
          summary: "Get application settings",
          description: "Outbound email / auth toggles and SMTP fields (password not returned).",
        },
      }
    )
    .put(
      "/app",
      async ({ request }) => {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);
        const raw = await readJsonBody(request);
        if (raw === null) return jsonResponse({ error: "Expected application/json body" }, 400);
        try {
          const result = await updateAppSettingsFromUser(parseSettingsUpdate(raw));
          return toResponse({ status: 200, body: result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Invalid request";
          return toResponse({ status: 400, body: { error: msg } });
        }
      },
      {
        parse: "none",
        detail: {
          ...openapi,
          summary: "Update application settings",
          description: "Partial update. Omit smtpPassword to keep current; null clears stored password.",
        },
      }
    )
);
