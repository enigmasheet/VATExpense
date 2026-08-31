import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { join } from "path";

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: pkg.version,
  },
};

export default nextConfig;
