// The app icon artwork, shared by every generated icon (favicon, Apple
// touch, PWA 192/512 and maskable) so they cannot drift apart. Uses the
// Warm theme's forest tile, the Baton W in off-white and a light-brass dot.
// `radius` rounds the tile; `scale` is how much of the tile the mark fills
// (smaller for maskable icons, whose edges get cropped by the OS).
export function BrandIcon({ radius, scale = 0.72 }: { radius: number; scale?: number }) {
  const pct = `${Math.round(scale * 100)}%`;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2c4a3e",
        borderRadius: radius,
      }}
    >
      <svg viewBox="0 0 64 64" width={pct} height={pct} fill="none">
        <path
          d="M9 18 L21 47 L32 25 L43 47 L55 18"
          stroke="#f7f5f0"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="55" cy="18" r="4.5" fill="#e7c98a" />
      </svg>
    </div>
  );
}
