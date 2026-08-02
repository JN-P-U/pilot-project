import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: ["@ui-test/react"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  serverExternalPackages: [],
};

export default nextConfig;
