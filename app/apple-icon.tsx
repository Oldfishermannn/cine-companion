import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#08080C",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            right: 0,
            height: 3,
            background: "#E8B661",
          }}
        />
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: "#E8B661",
            fontFamily: "serif",
            lineHeight: 1,
            marginTop: 12,
          }}
        >
          影
        </div>
      </div>
    ),
    { ...size },
  );
}
