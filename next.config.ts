import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  outputFileTracingIncludes: {
    "/api/preview": [
      "./public/fonts/DejaVuSans.ttf",
      "./node_modules/@napi-rs/canvas/**",
    ],
    "/api/quote": ["./public/fonts/DejaVuSans.ttf", "./node_modules/@napi-rs/canvas/**"],
    "/api/checkout": [
      "./public/fonts/DejaVuSans.ttf",
      "./node_modules/@napi-rs/canvas/**",
    ],
    "/api/webhooks/stripe": [
      "./public/fonts/DejaVuSans.ttf",
      "./node_modules/@napi-rs/canvas/**",
    ],
  },
};

export default nextConfig;
