import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["@resvg/resvg-js"],
  async rewrites() {
    return [
      {
        source: "/designs/:ref.pdf",
        destination: "/api/pdf/:ref",
      },
    ];
  },
};

export default withSerwist(nextConfig);
