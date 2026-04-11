import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, Fraunces, JetBrains_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { LangProvider } from "./i18n/LangProvider";

const cormorant = Cormorant_Garamond({
  variable: "--font-display-alt",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// ── New editorial typography stack ────────────────────────────────────
// Fraunces: variable serif with SOFT + WONK optical axes. Hero display face.
// When using axes[], weight must be "variable" (or omitted) — next/font
// loads the full variable file and we drive weight via font-variation-settings.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

// JetBrains Mono: metadata labels, issue numbers, section marks, dates.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Noto Serif SC: Chinese display face to pair with Fraunces.
const notoSerifSC = Noto_Serif_SC({
  variable: "--font-zh-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lights Out",
  description: "北美院线观影助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
      className={`${cormorant.variable} ${outfit.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${notoSerifSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
