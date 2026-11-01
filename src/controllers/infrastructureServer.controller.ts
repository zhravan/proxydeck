import { Elysia } from "elysia";
import { readJsonBody, toResponse } from "../http/json";
import { getUserIdFromRequest } from "../http/sessionUser";
import {
  createInfrastructureServerForUser,
  deleteInfrastructureServerForUserRequest,
  getInfrastructureServerForUser,
  listInfrastructureServersForUser,
  updateInfrastructureServerForUserRequest,
} from "../services/infrastructureServer.service";
import {
  exportInfrastructureServersResponse,
  importInfrastructureServersPortfolio,
} from "../services/infrastructureServerPortfolio.service";

const openapi = {
  tags: ["infrastructure"],
};

export const infrastructureServerRoutes = new Elysia().group("/api/servers", (app) =>
  app
    .get(
      "/export",
      async ({ request }) => {
        const url = new URL(request.url);
        const format = url.searchParams.get("format");
        const res = await exportInfrastructureServersResponse(await getUserIdFromRequest(request), format);
        return res instanceof Response ? res : toResponse(res);
      },
      {
        detail: {
          ...openapi,
          summary: "Export servers (JSON or CSV)",
          description: "Download server inventory backup. Use ?format=json or ?format=csv.",
        },
      }
    )
    .post(
      "/import",
      async ({ request }) =>
        toResponse(
          await importInfrastructureServersPortfolio(
            await getUserIdFromRequest(request),
            await readJsonBody(request)
          )
        ),
      {
        parse: "none",
        detail: {
          ...openapi,
          summary: "Import servers (JSON or CSV)",
          description:
            "Body: { format, dryRun?, onDuplicateId?, servers? | csv }. Validates rows; linkedHostnames resolves to portfolio domains.",
        },
      }
    )
    .get(
      "/",
      async ({ request }) =>
        toResponse(await listInfrastructureServersForUser(await getUserIdFromRequest(request))),
      {
        detail: {
          ...openapi,
          summary: "List servers",
          description: "Infrastructure inventory for the current user (metadata only; no secrets).",
        },
      }
    )
    .post(
      "/",
      async ({ request }) =>
        toResponse(
          await createInfrastructureServerForUser(
            await getUserIdFromRequest(request),
            await readJsonBody(request)
          )
        ),
      {
        parse: "none",
        detail: {
          ...openapi,
          summary: "Create server",
          description: "Add a server record (provider, region, optional links to portfolio domains).",
        },
      }
    )
    .get(
      "/:id",
      async ({ request, params }) =>
        toResponse(
          await getInfrastructureServerForUser(await getUserIdFromRequest(request), params.id)
        ),
      {
        detail: {
          ...openapi,
          summary: "Get server",
        },
      }
    )
    .patch(
      "/:id",
      async ({ request, params }) =>
        toResponse(
          await updateInfrastructureServerForUserRequest(
            await getUserIdFromRequest(request),
            params.id,
            await readJsonBody(request)
          )
        ),
      {
        parse: "none",
        detail: {
          ...openapi,
          summary: "Update server",
        },
      }
    )
    .delete(
      "/:id",
      async ({ request, params }) =>
        toResponse(
          await deleteInfrastructureServerForUserRequest(
            await getUserIdFromRequest(request),
            params.id
          )
        ),
      {
        detail: {
          ...openapi,
          summary: "Delete server",
        },
      }
    )
);
