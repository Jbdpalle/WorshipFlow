import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon-image";

// Maskable: full-bleed with the mark inside the OS safe zone (about 60%).
export async function GET() {
  return new ImageResponse(<BrandIcon radius={0} scale={0.58} />, { width: 512, height: 512 });
}
