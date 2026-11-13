import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LAND_AUTH_EMAIL_DOMAIN,
  generateInviteCode,
  landAuthError,
  landPasswordError,
  normalizeThaiPhone,
  phoneAuthError,
  phoneToAuthEmail,
  referralPath,
} from "./phoneAuth";

describe("เบอร์โทรสำหรับเข้าสู่ระบบ", () => {
  it("ตัดช่องว่างและขีด แล้วจับกับโดเมนสังเคราะห์", () => {
    assert.equal(normalizeThaiPhone(" 089-123-4567 "), "0891234567");
    assert.equal(normalizeThaiPhone("+66 89 123 4567"), "0891234567");
    assert.equal(normalizeThaiPhone("66891234567"), "0891234567");
    assert.equal(phoneToAuthEmail("0891234567"), `0891234567@${LAND_AUTH_EMAIL_DOMAIN}`);
    assert.equal(referralPath("AB23CD45"), "/register?ref=AB23CD45");
  });

  it("ปฏิเสธเบอร์ว่างหรือรูปแบบที่ใช้ไม่ได้", () => {
    assert.equal(normalizeThaiPhone("   "), null);
    assert.equal(normalizeThaiPhone("089"), null);
    assert.equal(normalizeThaiPhone("1234567890"), null);
    assert.equal(normalizeThaiPhone("08a1234567"), null);
    assert.equal(phoneAuthError(""), "กรุณากรอกเบอร์โทรศัพท์");
    assert.match(phoneAuthError("123") || "", /ไม่ถูกต้อง/);
    assert.equal(phoneAuthError("0891234567"), null);
  });

  it("รหัสแนะนำสั้นและไม่มีตัวอักษรที่สับสน และไม่โชว์อีเมลในข้อความผิดพลาด", () => {
    const code = generateInviteCode();
    assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    assert.equal(landPasswordError("12345"), "รหัสผ่านต้องมีอย่างน้อย 6 ตัว");
    assert.equal(landPasswordError("123456"), null);
    assert.equal(landAuthError({ message: "Password should be at least 6 characters" }), "รหัสผ่านต้องมีอย่างน้อย 6 ตัว");
    assert.equal(landAuthError({ message: "Invalid login credentials" }), "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง");
    assert.doesNotMatch(
      landAuthError({ message: "User already registered as 0891234567@landfinance.local" }),
      /landfinance\.local/,
    );
  });
});
