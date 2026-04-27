import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            top: 28,
            left: 0,
            right: 0,
            height: 8,
            background: "#E8B661",
          }}
        />
        <div
          style={{
            fontSize: 340,
            fontWeight: 700,
            color: "#E8B661",
            fontFamily: "serif",
            lineHeight: 1,
            marginTop: 36,
          }}
        >
          影
        </div>
      </div>
    ),
    { ...size },
  );
}
