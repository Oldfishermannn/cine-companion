import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lights Out · 影伴",
    short_name: "影伴",
    description:
      "北美院线观影助手 · 词汇预习 · 背景知识 · 厕所时间 · 观后复盘",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080C",
    theme_color: "#08080C",
    lang: "zh-CN",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
