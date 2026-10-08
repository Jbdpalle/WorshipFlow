import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandIcon radius={7} scale={0.8} />, { ...size });
}
