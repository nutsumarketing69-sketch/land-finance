import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { accountStop, handoffStopPage, isLandSupabaseUrl } from "./handoffPage";
import { LAND_SCHEMA, LAND_SUPABASE_URL } from "./supabase/land";
import { SUPABASE_URL } from "./supabase/public";
import {
  clearHandoffReplayForTests,
  consumeHandoffJti,
  signLandHandoff,
  verifyLandHandoff,
} from "./hubHandoff";

const SECRET = "handoff-test-secret-32-characters!";
const NOW = 1_700_000_000_000;
const JTI = "fixed-jti-value-0001";

describe("hub handoff token", () => {
  it("signs a 60 second token and verifies the same email", () => {
    const token = signLandHandoff("Person@Example.com", SECRET, { nowMs: NOW, jti: JTI });
    assert.equal(
      token,
      "v1.eyJpc3MiOiJkYjM1Ny1odWIiLCJhdWQiOiJsYW5kIiwiZW1haWwiOiJwZXJzb25AZXhhbXBsZS5jb20iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDA2MCwianRpIjoiZml4ZWQtanRpLXZhbHVlLTAwMDEifQ.0Ugo07AYBz_2b6C20KOC2btwAM5XaDeZalRUyAc0zo0",
    );
    const claims = verifyLandHandoff(token || "", SECRET, NOW + 1000);
    assert.equal(claims?.email, "person@example.com");
    assert.equal(claims?.exp, claims!.iat + 60);
  });

  it("rejects a bad signature, the wrong secret, a long lifetime, and an expired token", () => {
    const token = signLandHandoff("person@example.com", SECRET, { nowMs: NOW, jti: JTI });
    assert.ok(token);
    assert.equal(verifyLandHandoff(`${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`, SECRET, NOW), null);
    assert.equal(verifyLandHandoff(token, `${SECRET}x`, NOW), null);
    assert.equal(verifyLandHandoff(token, SECRET, NOW + 120_000), null);
    assert.equal(signLandHandoff("not-an-email", SECRET), null);
    assert.equal(signLandHandoff("person@example.com", "short"), null);

    const body = Buffer.from(
      JSON.stringify({
        iss: "db357-hub",
        aud: "land",
        email: "person@example.com",
        iat: 1_700_000_000,
        exp: 1_700_000_120,
        jti: JTI,
      }),
    ).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(`v1.${body}`).digest().toString("base64url");
    assert.equal(verifyLandHandoff(`v1.${body}.${sig}`, SECRET, NOW), null);

    const other = Buffer.from(
      JSON.stringify({
        iss: "db357-hub",
        aud: "other",
        email: "person@example.com",
        iat: 1_700_000_000,
        exp: 1_700_000_060,
        jti: JTI,
      }),
    ).toString("base64url");
    const otherSig = createHmac("sha256", SECRET).update(`v1.${other}`).digest().toString("base64url");
    assert.equal(verifyLandHandoff(`v1.${other}.${otherSig}`, SECRET, NOW), null);
  });

  it("accepts one use of a token id in this process", () => {
    clearHandoffReplayForTests();
    assert.equal(consumeHandoffJti(JTI, 1_700_000_060, NOW), true);
    assert.equal(consumeHandoffJti(JTI, 1_700_000_060, NOW + 1000), false);
    clearHandoffReplayForTests();
  });
});

describe("handoff stop page", () => {
  it("says when no Land account exists and does not echo a token", () => {
    const page = handoffStopPage("missing");
    assert.match(page, /Nothing was created/);
    assert.match(page, /ยังไม่มีบัญชี Land/);
    assert.doesNotMatch(page, /eyJ/);
    assert.equal(LAND_SCHEMA, "land");
    assert.equal(LAND_SUPABASE_URL, "https://aozoakeghslgnhdegdyr.supabase.co");
    assert.equal(isLandSupabaseUrl(LAND_SUPABASE_URL), true);
    assert.equal(isLandSupabaseUrl("https://fahkknzinragbeizymny.supabase.co"), false);
    assert.equal(isLandSupabaseUrl("http://aozoakeghslgnhdegdyr.supabase.co"), false);
    assert.notEqual(new URL(SUPABASE_URL).hostname, new URL(LAND_SUPABASE_URL).hostname);
    assert.equal(accountStop("none"), "missing");
    assert.equal(accountStop("ambiguous"), "ambiguous");
  });
});
