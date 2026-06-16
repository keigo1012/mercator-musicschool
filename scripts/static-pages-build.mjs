#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const [, , command] = process.argv;

if (command !== "build") {
  console.error("Usage: opennextjs-cloudflare build");
  process.exit(1);
}

const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
