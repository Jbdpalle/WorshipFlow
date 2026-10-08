import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon-image";

export async function GET() {
  return new ImageResponse(<BrandIcon radius={40} />, { width: 192, height: 192 });
}
