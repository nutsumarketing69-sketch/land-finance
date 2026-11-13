import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { latLngToWorld, parseGoogleMapsUrl, worldToLatLng } from "./mapLink";

describe("parseGoogleMapsUrl", () => {
  it("อ่านพิกัดจาก @lat,lng", () => {
    assert.deepEqual(
      parseGoogleMapsUrl("https://www.google.com/maps/@13.7563,100.5018,15z"),
      { status: "point", latitude: "13.7563", longitude: "100.5018" },
    );
  });

  it("อ่านพิกัดจาก q และ query ที่ถูกเข้ารหัส", () => {
    assert.deepEqual(parseGoogleMapsUrl("https://maps.google.com/?q=13.7563,100.5018"), {
      status: "point",
      latitude: "13.7563",
      longitude: "100.5018",
    });
    assert.deepEqual(
      parseGoogleMapsUrl("https://www.google.com/maps/search/?api=1&query=13.7563%2C100.5018"),
      { status: "point", latitude: "13.7563", longitude: "100.5018" },
    );
  });

  it("ให้ความสำคัญกับ !3d !4d มากกว่าจุดกึ่งกลางมุมมอง", () => {
    assert.deepEqual(
      parseGoogleMapsUrl(
        "https://www.google.com/maps/place/Land/@13.1,100.1,17z/data=!3d13.7563!4d100.5018",
      ),
      { status: "point", latitude: "13.7563", longitude: "100.5018" },
    );
  });

  it("ลิงก์สั้นอ่านพิกัดไม่ได้ และค่าว่างหรือพิกัดเกินช่วงไม่ถูกใช้", () => {
    assert.deepEqual(parseGoogleMapsUrl("https://maps.app.goo.gl/abc123"), { status: "short" });
    assert.deepEqual(parseGoogleMapsUrl("  "), { status: "empty" });
    assert.deepEqual(parseGoogleMapsUrl("https://maps.google.com/?q=95,100"), { status: "unparsed" });
  });
});

describe("map projection", () => {
  it("แปลงพิกัดไปกลับได้ใกล้เคียงจุดเดิม", () => {
    const world = latLngToWorld(13.7563, 100.5018, 15);
    const back = worldToLatLng(world.x, world.y, 15);
    assert.ok(Math.abs(back.lat - 13.7563) < 1e-8);
    assert.ok(Math.abs(back.lng - 100.5018) < 1e-8);
  });
});
