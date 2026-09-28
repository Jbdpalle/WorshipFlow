import { ImageResponse } from "next/og";

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
          borderRadius: 106,
          color: "white",
          fontSize: 310,
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
