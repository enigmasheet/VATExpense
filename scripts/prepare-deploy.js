/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "drizzle");
const dest = path.join(__dirname, "..", ".next", "server", "drizzle");

if (!fs.existsSync(src)) {
  console.log("[prepare-deploy] drizzle/ folder not found, skipping.");
  process.exit(0);
}

fs.cpSync(src, dest, { recursive: true });
console.log("[prepare-deploy] Copied drizzle/ -> .next/server/drizzle/");
