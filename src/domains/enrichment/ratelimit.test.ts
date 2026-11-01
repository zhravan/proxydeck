import { describe, expect, test } from "bun:test";
import { rateLimitDomainCheck, rateLimitDomainLookup } from "./ratelimit";

describe("domain check rate limits", () => {
  test("limits one explicit refresh per domain per minute", () => {
    const user = crypto.randomUUID();
    const domain = crypto.randomUUID();
    expect(rateLimitDomainCheck(user, domain).ok).toBe(true);
    const blocked = rateLimitDomainCheck(user, domain);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  test("allows a different domain for the same user", () => {
    const user = crypto.randomUUID();
    expect(rateLimitDomainCheck(user, crypto.randomUUID()).ok).toBe(true);
    expect(rateLimitDomainCheck(user, crypto.randomUUID()).ok).toBe(true);
  });

  test("keeps preview lookup allowance independent from explicit checks", () => {
    const user = crypto.randomUUID();
    expect(rateLimitDomainCheck(user, crypto.randomUUID()).ok).toBe(true);
    expect(rateLimitDomainLookup(user).ok).toBe(true);
  });
});
