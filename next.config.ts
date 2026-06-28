import type { NextConfig } from "next";

const defaultFrameAncestors = [
  "'self'",
  "https://cedarmountainstays.com",
  "https://www.cedarmountainstays.com",
  "https://cedar-mountain-stays.vercel.app",
  "http://localhost:3000",
];

const frameAncestors = Array.from(
  new Set([
    ...(process.env.ALLOWED_FRAME_ANCESTORS || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((value) => (value === "self" ? "'self'" : value)),
    ...defaultFrameAncestors,
  ])
).join(" ");
const scriptPolicy = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptPolicy,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              `frame-ancestors ${frameAncestors}`,
              "base-uri 'self'",
              "form-action 'self'"
            ].join("; ")
          }
        ]
      }
    ];
  }
};

export default nextConfig;
