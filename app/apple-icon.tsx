import { ImageResponse } from "next/og";
import { deedMark } from "./components/deedMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(deedMark(180), { ...size });
}
