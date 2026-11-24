import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {"/api/team-poster-preparation/**/*": ["./node_modules/@sparticuz/chromium/bin/**/*", "./public/fonts/**/*", "./public/avatars/**/*"], "/api/data-analysis/**/*": ["./node_modules/@sparticuz/chromium/bin/**/*", "./public/fonts/**/*", "./public/avatars/**/*"], "/api/team-poster-templates": ["./node_modules/@sparticuz/chromium/bin/**/*", "./public/fonts/**/*", "./public/avatars/**/*"]},
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/events/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Manager work is shared live between devices. Never allow a browser,
        // proxy, or phone web view to reuse an earlier portal shell here.
        source: "/manager/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
