import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: ["@auto-ui-test/react"],
};

export default nextConfig;
