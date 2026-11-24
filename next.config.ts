import type { NextConfig } from "next";

// External browser packages resolve runtime files dynamically. Include the
// complete packages, not only the Chromium binary, in every worker entry point.
const posterWorkerFiles = [
  "./node_modules/playwright-core/**/*",
  "./node_modules/@sparticuz/chromium/**/*",
  "./public/fonts/**/*",
  "./public/avatars/**/*",
];
const posterWorkerRoutes = [
  "/api/team-poster-preparation",
  "/api/team-poster-preparation/run",
  "/api/team-poster-templates",
  "/api/data-analysis/import",
  "/api/data-analysis/manager-assignments",
  "/api/data-analysis/excluded-creators",
  "/api/data-analysis/fallback-avatars",
];
const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: Object.fromEntries(posterWorkerRoutes.map(route=>[route,posterWorkerFiles])),
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
