import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
    ],
  },
  // Include pre-warmed cache files in serverless function bundles on Vercel
  outputFileTracingIncludes: {
    "/api/movie-ai":       ["./cache/**/*"],
    "/api/movie-funfacts": ["./cache/**/*"],
    "/api/movie-post":     ["./cache/**/*"],
    "/api/movie-breaks":   ["./cache/**/*"],
  },
};

export default nextConfig;
