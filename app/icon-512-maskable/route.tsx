import { ImageResponse } from "next/og";

// Maskable icon: Android crops the outer ~20% into various shapes, so the
// glyph stays within a smaller "safe zone" and the background fills edge to
// edge with no rounding (the OS applies its own mask shape).
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b8862c",
          color: "white",
          fontSize: 210,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        W
      </div>
    ),
    { width: 512, height: 512 },
  );
}
