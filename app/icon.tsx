import { ImageResponse } from "next/og";
import { deedMark } from "./components/deedMark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(deedMark(64), { ...size });
}
