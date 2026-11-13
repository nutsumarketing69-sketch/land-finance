import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBackup, planRestore } from "./backupFile";

const owner = "00000000-0000-4000-8000-000000000001";
const customer = "00000000-0000-4000-8000-0000000000aa";
const land = "00000000-0000-4000-8000-0000000000bb";
const contract = "00000000-0000-4000-8000-0000000000cc";

describe("ไฟล์สำรอง", () => {
  it("อ่าน JSON สี่ตาราง และบังคับเจ้าของแถวเป็นผู้ใช้ปัจจุบัน", () => {
    const parsed = parseBackup(JSON.stringify({
      customers: [{ id: customer, owner_id: "someone-else", full_name: "สมชาย", phone: "0891112222" }],
      land_assets: [{ id: land, customer_id: customer, deed_number: "089-55" }],
      contracts: [{ id: contract, customer_id: customer, land_id: land, contract_number: "LF-0890" }],
      commission_splits: [{ contract_id: contract, person_name: "นายเอ", percentage: "10" }],
    }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planRestore(parsed.data, owner, {
      customerIds: new Set(),
      landIds: new Set(),
      contractIds: new Set(),
    });
    assert.equal(plan.customers[0]?.owner_id, owner);
    assert.equal(plan.landAssets[0]?.owner_id, owner);
    assert.equal(plan.contracts[0]?.owner_id, owner);
    assert.equal(plan.splits.length, 1);
    assert.equal(plan.skipped.length, 0);
  });

  it("ข้ามแถวที่ชี้ไปหารายการที่ผู้ใช้ไม่ได้เป็นเจ้าของ", () => {
    const parsed = parseBackup(JSON.stringify({
      customers: [],
      land_assets: [],
      contracts: [{ id: contract, customer_id: customer, contract_number: "LF-1" }],
      commission_splits: [{ contract_id: contract, person_name: "นายเอ", percentage: "10" }],
    }));
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const plan = planRestore(parsed.data, owner, {
      customerIds: new Set(),
      landIds: new Set(),
      contractIds: new Set(),
    });
    assert.equal(plan.contracts.length, 0);
    assert.equal(plan.splits.length, 0);
    assert.equal(plan.skipped.length, 2);
  });
});
