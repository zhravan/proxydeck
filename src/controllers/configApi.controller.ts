import { Elysia } from "elysia";
import { readJsonBody, toResponse } from "../http/json";
import {
  applyConfigBody,
  getConfigHistoryList,
  getConfigPreview,
  getCurrentConfig,
  rollbackConfigBody,
  validateConfigBody,
} from "../services/configApi.service";

const configOpenapi = {
  tags: ["config"],
};

export const configApiRoutes = new Elysia()
  .post(
    "/api/config/validate",
    async ({ body }) =>
      toResponse(await validateConfigBody(typeof body === "string" ? JSON.parse(body) : body)),
    {
      detail: {
        ...configOpenapi,
        summary: "Validate config payload",
      },
    }
  )
  .post(
    "/api/config/apply",
    async ({ body }) =>
      toResponse(await applyConfigBody(typeof body === "string" ? JSON.parse(body) : body)),
    {
      detail: {
        ...configOpenapi,
        summary: "Apply config",
      },
    }
  )
  .get("/api/config/preview", async () => toResponse(await getConfigPreview()), {
    detail: {
      ...configOpenapi,
      summary: "Preview generated config",
    },
  })
  .get("/api/config/current", async () => toResponse(await getCurrentConfig()), {
    detail: {
      ...configOpenapi,
      summary: "Current active config",
    },
  })
  .get("/api/config/history", async () => toResponse(await getConfigHistoryList()), {
    detail: {
      ...configOpenapi,
      summary: "Config history",
    },
  })
  .post(
    "/api/config/rollback",
    async ({ body }) =>
      toResponse(await rollbackConfigBody(typeof body === "string" ? JSON.parse(body) : body)),
    {
      detail: {
        ...configOpenapi,
        summary: "Rollback config",
      },
    }
  );
