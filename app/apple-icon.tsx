import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the tile is full-bleed.
export default function AppleIcon() {
  return new ImageResponse(<BrandIcon radius={0} scale={0.68} />, { ...size });
}
