import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findAuthUserByEmail, matchAuthUsers, recoveryHashForExistingUser } from "./landAccount";

const KEY = "service-role-test-key";

describe("land account match", () => {
  it("keeps one exact email and stops when several match", () => {
    assert.deepEqual(matchAuthUsers([{ id: "a", email: "Person@Example.com" }], "person@example.com"), {
      status: "found",
      id: "a",
      email: "person@example.com",
    });
    assert.equal(
      matchAuthUsers(
        [
          { id: "a", email: "person@example.com" },
          { id: "b", email: "person@example.com" },
        ],
        "person@example.com",
      ).status,
      "ambiguous",
    );
    assert.equal(matchAuthUsers([{ id: "a", email: "other@example.com" }], "person@example.com").status, "none");
  });

  it("uses an exact email lookup and does not create a user", async () => {
    const calls: string[] = [];
    const found = await findAuthUserByEmail({
      supabaseUrl: "https://fahkknzinragbeizymny.supabase.co",
      serviceRoleKey: KEY,
      email: "person@example.com",
      fetchImpl: async (url, init) => {
        calls.push(url);
        assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
        assert.equal(init.headers.apikey, KEY);
        return jsonResponse({ users: [{ id: "user-1", email: "person@example.com" }] }, 200, "1");
      },
    });
    assert.deepEqual(found, { status: "found", id: "user-1", email: "person@example.com" });
    assert.equal(calls.length, 1);
    assert.match(calls[0], /email=person%40example.com/);
    assert.doesNotMatch(calls[0], /filter=/);
  });

  it("falls back to filter pages when the email query is ignored", async () => {
    let calls = 0;
    const found = await findAuthUserByEmail({
      supabaseUrl: "https://fahkknzinragbeizymny.supabase.co",
      serviceRoleKey: KEY,
      email: "person@example.com",
      fetchImpl: async (url) => {
        calls += 1;
        if (url.includes("email=")) {
          return jsonResponse({ users: [{ id: "other", email: "other@example.com" }] }, 200, "50");
        }
        assert.match(url, /filter=person%40example.com/);
        return jsonResponse({ users: [{ id: "user-1", email: "Person@Example.com" }] }, 200, "1");
      },
    });
    assert.equal(found.status, "found");
    if (found.status === "found") assert.equal(found.id, "user-1");
    assert.equal(calls, 2);
  });

  it("stops when the exact lookup is empty", async () => {
    const found = await findAuthUserByEmail({
      supabaseUrl: "https://fahkknzinragbeizymny.supabase.co",
      serviceRoleKey: KEY,
      email: "missing@example.com",
      fetchImpl: async () => jsonResponse({ users: [] }, 200, "0"),
    });
    assert.equal(found.status, "none");
  });

  it("does not keep a recovery hash for a different user", async () => {
    const link = await recoveryHashForExistingUser({
      expectedUserId: "user-1",
      email: "person@example.com",
      generate: async () => ({ userId: "user-2", tokenHash: "hash-should-not-be-used" }),
    });
    assert.equal(link.status, "mismatch");
    assert.equal("tokenHash" in link, false);
  });
});

function jsonResponse(body: unknown, status: number, total: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "x-total-count" ? total : null) },
    json: async () => body,
  };
}
