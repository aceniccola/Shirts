import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/preview": ["./public/fonts/DejaVuSans.ttf"],
    "/api/quote": ["./public/fonts/DejaVuSans.ttf"],
    "/api/checkout": ["./public/fonts/DejaVuSans.ttf"],
    "/api/webhooks/stripe": ["./public/fonts/DejaVuSans.ttf"],
  },
};

export default nextConfig;
