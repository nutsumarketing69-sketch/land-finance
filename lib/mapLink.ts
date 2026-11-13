export interface MapPoint {
  latitude: string;
  longitude: string;
}

export type MapParseResult =
  | ({ status: "point" } & MapPoint)
  | { status: "short" }
  | { status: "empty" }
  | { status: "unparsed" };

const COORDINATE = String.raw`-?\d{1,3}(?:\.\d+)?`;

function point(latitude: string, longitude: string): MapPoint | null {
  if (!new RegExp(`^${COORDINATE}$`).test(latitude)) return null;
  if (!new RegExp(`^${COORDINATE}$`).test(longitude)) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude, longitude };
}

/** อ่านละติจูดและลองจิจูดจากลิงก์ Google Maps แบบที่พบบ่อย ลิงก์สั้นอ่านพิกัดไม่ได้ */
export function parseGoogleMapsUrl(input: string): MapParseResult {
  const raw = input.trim();
  if (!raw) return { status: "empty" };
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(decoded)) return { status: "short" };

  const place = decoded.match(new RegExp(`!3d(${COORDINATE})!4d(${COORDINATE})`));
  if (place) {
    const found = point(place[1], place[2]);
    if (found) return { status: "point", ...found };
  }

  const at = decoded.match(new RegExp(`@(${COORDINATE}),(${COORDINATE})`));
  if (at) {
    const found = point(at[1], at[2]);
    if (found) return { status: "point", ...found };
  }

  const query = decoded.match(
    new RegExp(`(?:[?&](?:q|query|ll|center)=)(${COORDINATE}),\\s*(${COORDINATE})`),
  );
  if (query) {
    const found = point(query[1], query[2]);
    if (found) return { status: "point", ...found };
  }

  return { status: "unparsed" };
}

const TILE = 256;

export function latLngToWorld(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

export function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}
