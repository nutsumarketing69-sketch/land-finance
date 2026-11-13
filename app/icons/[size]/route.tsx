import { ImageResponse } from "next/og";
import { deedMark } from "@/app/components/deedMark";

const ALLOWED = new Set(["192", "512"]);

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size: raw } = await context.params;
  const size = ALLOWED.has(raw) ? Number(raw) : 192;
  return new ImageResponse(deedMark(size), { width: size, height: size });
}
