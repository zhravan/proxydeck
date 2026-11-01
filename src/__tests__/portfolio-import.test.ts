import { afterEach, describe, expect, mock, test } from "bun:test";

const validDomainId = "11111111-1111-4111-8111-111111111111";
const validServerId = "22222222-2222-4222-8222-222222222222";
const secondServerId = "33333333-3333-4333-8333-333333333333";

const repository = {
  findDomainsByUserId: mock(async (_userId: string) => [] as any[]),
  findDomainByHostnameForUser: mock(async (_hostname: string, _userId: string) => undefined as any),
  findDomainByIdForUser: mock(async (_id: string, _userId: string) => undefined as any),
  insertDomain: mock(async (_row: any) => ({ id: validDomainId })),
  updateDomainForUser: mock(async (_id: string, _userId: string, _row: any) => ({ id: validDomainId })),
  findInfrastructureServerByIdForUser: mock(async (_id: string, _userId: string) => undefined as any),
  findInfrastructureServersByUserId: mock(async (_userId: string) => [] as any[]),
  insertInfrastructureServer: mock(async (row: any) => ({ id: row.id })),
  updateInfrastructureServerForUser: mock(async (_id: string, _userId: string, _row: any) => ({ id: validServerId })),
};

mock.module("../repositories/domain.repository", () => ({
  findDomainsByUserId: repository.findDomainsByUserId,
  findDomainByHostnameForUser: repository.findDomainByHostnameForUser,
  findDomainByIdForUser: repository.findDomainByIdForUser,
  insertDomain: repository.insertDomain,
  updateDomainForUser: repository.updateDomainForUser,
}));
mock.module("../repositories/infrastructureServer.repository", () => ({
  findInfrastructureServerByIdForUser: repository.findInfrastructureServerByIdForUser,
  findInfrastructureServersByUserId: repository.findInfrastructureServersByUserId,
  insertInfrastructureServer: repository.insertInfrastructureServer,
  updateInfrastructureServerForUser: repository.updateInfrastructureServerForUser,
}));

const { importDomainsPortfolio } = await import("../services/domainPortfolio.service");
const { importInfrastructureServersPortfolio } = await import("../services/infrastructureServerPortfolio.service");
const { parseCsv } = await import("../portfolio/csv");

function resetMocks() {
  for (const fn of Object.values(repository)) fn.mockClear();
  repository.findDomainsByUserId.mockResolvedValue([]);
  repository.findDomainByHostnameForUser.mockResolvedValue(undefined);
  repository.findDomainByIdForUser.mockResolvedValue(undefined);
  repository.insertDomain.mockImplementation(async (row: any) => ({ id: row.id }));
  repository.updateDomainForUser.mockResolvedValue({ id: validDomainId });
  repository.findInfrastructureServerByIdForUser.mockResolvedValue(undefined);
  repository.findInfrastructureServersByUserId.mockResolvedValue([]);
  repository.insertInfrastructureServer.mockImplementation(async (row: any) => ({ id: row.id }));
  repository.updateInfrastructureServerForUser.mockResolvedValue({ id: validServerId });
}

afterEach(resetMocks);

const domain = (hostname: string, id = validDomainId) => ({ id, hostname });
const server = (id = validServerId, name = "app") => ({ id, provider: "AWS", name });

describe("portfolio CSV parser", () => {
  test("rejects unterminated quotes", () => {
    expect(() => parseCsv('hostname,notes\\nexample.com,"unfinished')).toThrow(/unterminated/i);
  });

  test("rejects quotes embedded in unquoted fields", () => {
    expect(() => parseCsv('hostname,notes\\nexample.com,bad"quote')).toThrow(/quote inside/i);
  });

  test("rejects characters after a closing quote", () => {
    expect(() => parseCsv('hostname,notes\\nexample.com,"valid"x')).toThrow(/after closing quote/i);
  });
});

describe("domain portfolio imports", () => {
  test("rejects duplicate IDs and normalized hostnames in JSON payloads", async () => {
    const duplicateId = await importDomainsPortfolio("user-1", {
      format: "json",
      domains: [domain("one.example", validDomainId), domain("two.example", validDomainId)],
    });
    expect(duplicateId.status).toBe(200);
    expect((duplicateId.body as any).created).toBe(1);
    expect((duplicateId.body as any).errors).toHaveLength(1);

    resetMocks();
    const duplicateHost = await importDomainsPortfolio("user-1", {
      format: "json",
      domains: [domain("Example.com", validDomainId), domain("example.com.", secondServerId)],
    });
    expect(duplicateHost.status).toBe(200);
    expect((duplicateHost.body as any).created).toBe(1);
    expect((duplicateHost.body as any).errors).toHaveLength(1);
  });

  test("rejects duplicate CSV records by ID and normalized hostname", async () => {
    const csv = [
      "id,hostname",
      `${validDomainId},example.com`,
      `${validDomainId},other.example`,
      `${secondServerId},EXAMPLE.COM.`,
    ].join("\\n");
    const result = await importDomainsPortfolio("user-1", { format: "csv", csv });
    expect(result.status).toBe(200);
    expect((result.body as any).created).toBe(1);
    expect((result.body as any).errors).toHaveLength(2);
    expect(repository.insertDomain).toHaveBeenCalledTimes(1);
  });

  test("rejects duplicate CSV records using normalized hostname", async () => {
    const csv = [
      "id,hostname",
      `${validDomainId},example.com`,
      `${secondServerId},EXAMPLE.COM.`,
    ].join("\\n");
    const result = await importDomainsPortfolio("user-1", { format: "csv", csv });
    expect(result.status).toBe(200);
    expect((result.body as any).errors).toHaveLength(1);
    expect(repository.insertDomain).toHaveBeenCalledTimes(1);
  });

  test("reports malformed CSV as a client error, not an unhandled exception", async () => {
    const result = await importDomainsPortfolio("user-1", {
      format: "csv",
      csv: 'hostname,notes\\nexample.com,"unterminated',
    });
    expect(result.status).toBe(400);
  });

  test("rejects invalid UUIDs", async () => {
    const result = await importDomainsPortfolio("user-1", {
      format: "json",
      domains: [domain("example.com", "not-a-uuid")],
    });
    expect(result.status).toBe(400);
    expect(repository.insertDomain).not.toHaveBeenCalled();
  });

  test("dry-run and actual import report the same plan", async () => {
    const input = { format: "json", onDuplicateHostname: "error", domains: [domain("one.example"), domain("two.example", secondServerId)] };
    const dry = await importDomainsPortfolio("user-1", { ...input, dryRun: true });
    expect(repository.insertDomain).not.toHaveBeenCalled();
    const actual = await importDomainsPortfolio("user-1", { ...input, dryRun: false });
    expect({
      created: (dry.body as any).created,
      updated: (dry.body as any).updated,
      skipped: (dry.body as any).skipped,
      errors: (dry.body as any).errors,
    }).toEqual({
      created: (actual.body as any).created,
      updated: (actual.body as any).updated,
      skipped: (actual.body as any).skipped,
      errors: (actual.body as any).errors,
    });
    expect(repository.insertDomain).toHaveBeenCalledTimes(2);
  });
});

describe("infrastructure server portfolio imports", () => {
  test("rejects duplicate server IDs in JSON payloads", async () => {
    const result = await importInfrastructureServersPortfolio("user-1", {
      format: "json",
      servers: [server(), server()],
    });
    expect(result.status).toBe(200);
    expect((result.body as any).errors).toHaveLength(1);
    expect(repository.insertInfrastructureServer).toHaveBeenCalledTimes(1);
  });

  test("allows different server IDs to share a hostname-free server name", async () => {
    const result = await importInfrastructureServersPortfolio("user-1", {
      format: "json",
      servers: [server(validServerId, "app"), server(secondServerId, "app")],
    });
    expect(result.status).toBe(200);
    expect((result.body as any).created).toBe(2);
  });

  test("rejects invalid UUIDs", async () => {
    const result = await importInfrastructureServersPortfolio("user-1", {
      format: "json",
      servers: [server("invalid")],
    });
    expect(result.status).toBe(400);
    expect(repository.insertInfrastructureServer).not.toHaveBeenCalled();
  });

  test("dry-run and actual import report the same plan", async () => {
    const input = { format: "json", servers: [server(), server(secondServerId, "worker")] };
    const dry = await importInfrastructureServersPortfolio("user-1", { ...input, dryRun: true });
    expect(repository.insertInfrastructureServer).not.toHaveBeenCalled();
    const actual = await importInfrastructureServersPortfolio("user-1", { ...input, dryRun: false });
    expect({
      created: (dry.body as any).created,
      updated: (dry.body as any).updated,
      skipped: (dry.body as any).skipped,
      errors: (dry.body as any).errors,
    }).toEqual({
      created: (actual.body as any).created,
      updated: (actual.body as any).updated,
      skipped: (actual.body as any).skipped,
      errors: (actual.body as any).errors,
    });
    expect(repository.insertInfrastructureServer).toHaveBeenCalledTimes(2);
  });

  test("imports servers with linked domains resolved from linkedHostnames", async () => {
    repository.findDomainsByUserId.mockResolvedValue([
      { id: validDomainId, hostname: "example.com" },
      { id: secondServerId, hostname: "api.example.com" },
    ] as any);
    const result = await importInfrastructureServersPortfolio("user-1", {
      format: "json",
      servers: [{
        ...server(),
        linkedHostnames: ["EXAMPLE.COM.", "api.example.com"],
      }],
    });
    expect(result.status).toBe(200);
    expect(repository.insertInfrastructureServer).toHaveBeenCalledWith(
      expect.objectContaining({ linkedDomainIds: [validDomainId, secondServerId] }),
    );
  });
});
