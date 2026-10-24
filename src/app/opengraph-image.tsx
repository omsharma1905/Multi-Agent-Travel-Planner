import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#111111",
          padding: "70px 80px",
          color: "#FAF7F0",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle accent border */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        />

        {/* Top Header: Brand Mark + Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 17.5H9L14 4.5L19 17.5H21.5"
              stroke="#1F3D2B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="14" cy="4.5" r="2" fill="#F06C5B" />
          </svg>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "0.28em",
              color: "#FFFFFF",
            }}
          >
            SafariX
          </div>
        </div>

        {/* Center Editorial Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            maxWidth: "920px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: 14,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "#F4B942",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#F06C5B",
              }}
            />
            AI Travel Planner
          </div>

          <div
            style={{
              fontSize: 66,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#FAF7F0",
            }}
          >
            Your entire journey, intelligently planned around you.
          </div>
        </div>

        {/* Bottom Bar: Multi-agent coordination note */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "24px",
            fontSize: 13,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <div>MULTI-AGENT TRAVEL COORDINATION</div>
          <div>SAFARIX.TRAVEL</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
