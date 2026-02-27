#!/usr/bin/env node
/**
 * Verify that Next.js build produced required static assets.
 * Fails the build (exit 1) if any are missing, so Netlify deploy catches issues early.
 */
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const nextStatic = join(root, ".next", "static");
const chunks = join(nextStatic, "chunks");
const css = join(nextStatic, "css");

const checks = [
  { path: nextStatic, name: ".next/static" },
  { path: chunks, name: ".next/static/chunks" },
  { path: css, name: ".next/static/css" },
];

let failed = false;
for (const { path: p, name } of checks) {
  if (!existsSync(p)) {
    console.error(`[verify-next-assets] MISSING: ${name}`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "[verify-next-assets] Next.js static assets are incomplete. Build may have failed or output is misconfigured."
  );
  process.exit(1);
}

console.log("[verify-next-assets] OK: required static assets exist");
