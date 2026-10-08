import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon-image";

export async function GET() {
  return new ImageResponse(<BrandIcon radius={106} />, { width: 512, height: 512 });
}
