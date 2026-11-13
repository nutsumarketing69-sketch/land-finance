import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAlert, matchContracts, previewContracts } from "./dashboardData";

describe("แดชบอร์ด", () => {
  const { owned } = previewContracts("2026-11-13");

  it("คำว่า 089 ตรงชื่อ เบอร์ โฉนด หรือเลขสัญญาทันที", () => {
    const hits = matchContracts(owned, "089");
    const reasons = hits.flatMap((hit) => hit.reasons);
    assert.ok(reasons.includes("phone"));
    assert.ok(reasons.includes("deed"));
    assert.ok(reasons.includes("contract"));
    assert.equal(matchContracts(owned, "   ").length, 0);
  });

  it("แยกสัญญาที่เข้าช่วงเตือนและสัญญาที่เลยกำหนด", () => {
    const kinds = owned.map((contract) => classifyAlert(contract, "2026-11-13"));
    assert.deepEqual(kinds, ["upcoming", "overdue", null]);
    assert.equal(classifyAlert({ ...owned[1], status: "closed" }, "2026-11-13"), null);
  });
});
