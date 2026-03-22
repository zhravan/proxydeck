import { Elysia } from "elysia";
import { readJsonBody, toResponse } from "../http/json";
import { getUserIdFromRequest } from "../http/sessionUser";
import {
  createDomainForUser,
  deleteDomainForUserRequest,
  getDomainForUser,
  listDomainsForUser,
  lookupDomainForUser,
  updateDomainForUserRequest,
} from "../services/domain.service";

const domainOpenapi = {
  tags: ["domains"],
};

export const domainRoutes = new Elysia().group("/api/domains", (app) =>
  app
    .get(
      "/",
      async ({ request }) =>
        toResponse(await listDomainsForUser(await getUserIdFromRequest(request))),
      {
        detail: {
          ...domainOpenapi,
          summary: "List domains",
          description: "All portfolio domains for the current user.",
        },
      }
    )
    .get(
      "/lookup",
      async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("hostname") ?? url.searchParams.get("domain") ?? "";
        return toResponse(await lookupDomainForUser(await getUserIdFromRequest(request), raw));
      },
      {
        detail: {
          ...domainOpenapi,
          summary: "Public lookup (preview)",
          description: "Runs live enrichment for `hostname` / `domain` query param (rate-limited). Does not persist.",
        },
      }
    )
    .post(
      "/",
      async ({ request }) =>
        toResponse(
          await createDomainForUser(await getUserIdFromRequest(request), await readJsonBody(request))
        ),
      {
        parse: "none",
        detail: {
          ...domainOpenapi,
          summary: "Create domain",
          description: "Add a domain; optional public enrichment unless `skipPublicLookup` is true.",
        },
      }
    )
    .get(
      "/:id",
      async ({ request, params }) =>
        toResponse(await getDomainForUser(await getUserIdFromRequest(request), params.id)),
      {
        detail: {
          ...domainOpenapi,
          summary: "Get domain",
          description: "Fetch one domain by id (must belong to the current user).",
        },
      }
    )
    .patch(
      "/:id",
      async ({ request, params }) =>
        toResponse(
          await updateDomainForUserRequest(
            await getUserIdFromRequest(request),
            params.id,
            await readJsonBody(request)
          )
        ),
      {
        parse: "none",
        detail: {
          ...domainOpenapi,
          summary: "Update domain",
          description: "Patch hostname, registrar, notes, expiry. Set `fetchPublicData: true` to refresh enrichment.",
        },
      }
    )
    .delete(
      "/:id",
      async ({ request, params }) =>
        toResponse(await deleteDomainForUserRequest(await getUserIdFromRequest(request), params.id)),
      {
        detail: {
          ...domainOpenapi,
          summary: "Delete domain",
        },
      }
    )
);
